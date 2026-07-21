'use strict';

// ─────────────────────────────────────────────────────────────
//  POST /api/create-order
//  Recebe { items: [{id, quantity}], customer: {...} }.
//  - Recalcula o total no servidor (ignora qualquer preço do cliente).
//  - Cria o pedido no Postgres com status "pending".
//  - Gera o Pix estático (BR Code Copia e Cola) com o valor EXATO —
//    sem chamar nenhuma API externa.
//  - Devolve { order_id, pix_payload, total_formatted } para o front
//    renderizar o QR Code e o Copia e Cola.
// ─────────────────────────────────────────────────────────────
const { sql } = require('@vercel/postgres');
const { getMenuItem } = require('./_menu');
const { buildPixPayload } = require('./_pix');

const MAX_QTY_PER_ITEM = 50;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Método não permitido.' });
    }

    const pixKey = process.env.PIX_KEY;
    if (!pixKey) {
        console.error('PIX_KEY não configurada.');
        return res.status(500).json({ error: 'Pagamento indisponível no momento.' });
    }

    try {
        const body = req.body || {};
        const rawItems = Array.isArray(body.items) ? body.items : [];
        const customer = body.customer || {};

        // ── Validação dos dados do cliente ──
        const name = String(customer.name || '').trim();
        const phone = String(customer.phone || '').trim();
        const email = String(customer.email || '').trim();
        // Só existe consumo no local: 'dinein' (comer no local) ou 'pickup' (retirar).
        // Não há entrega, então nenhum endereço é coletado.
        const fulfillment = customer.fulfillment === 'pickup' ? 'pickup' : 'dinein';

        if (name.length < 2) {
            return res.status(400).json({ error: 'Informe seu nome.' });
        }
        if (phone.replace(/\D/g, '').length < 10) {
            return res.status(400).json({ error: 'Informe um telefone válido com DDD.' });
        }
        if (email && !EMAIL_RE.test(email)) {
            return res.status(400).json({ error: 'E-mail inválido.' });
        }

        // ── Recalcula o total no servidor (nunca confia no preço do cliente) ──
        const storedItems = [];
        let totalCents = 0;

        for (const raw of rawItems) {
            const id = parseInt(raw && raw.id, 10);
            const quantity = parseInt(raw && raw.quantity, 10);
            const menuItem = getMenuItem(id);

            if (!menuItem) {
                return res.status(400).json({ error: 'Item inválido no carrinho.' });
            }
            if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY_PER_ITEM) {
                return res.status(400).json({ error: 'Quantidade inválida.' });
            }

            totalCents += menuItem.priceCents * quantity;
            storedItems.push({
                id: id,
                name: menuItem.name,
                quantity: quantity,
                unit_price_cents: menuItem.priceCents
            });
        }

        if (storedItems.length === 0) {
            return res.status(400).json({ error: 'Seu carrinho está vazio.' });
        }

        // ── Cria o pedido pendente no banco ──
        const itemsJson = JSON.stringify(storedItems);

        const inserted = await sql`
            INSERT INTO orders (items, customer_name, customer_phone, customer_email, fulfillment, total_cents, status)
            VALUES (${itemsJson}::jsonb, ${name}, ${phone}, ${email || null}, ${fulfillment}, ${totalCents}, 'pending')
            RETURNING id
        `;
        const orderId = inserted.rows[0].id;

        // ── Gera o Pix estático (sem API externa) ──
        // txid: primeiros 25 caracteres alfanuméricos do id do pedido (sem hífen).
        const txid = String(orderId).replace(/[^A-Za-z0-9]/g, '').slice(0, 25);
        const pixPayload = buildPixPayload({
            key: pixKey,
            merchantName: process.env.PIX_MERCHANT_NAME || 'HAMBURGADA DA CRUZ',
            merchantCity: process.env.PIX_MERCHANT_CITY || 'JOAO PESSOA',
            amountCents: totalCents,
            txid: txid
        });

        const totalFormatted = 'R$ ' + (totalCents / 100).toFixed(2).replace('.', ',');

        return res.status(200).json({
            order_id: String(orderId),
            pix_payload: pixPayload,
            total_formatted: totalFormatted
        });
    } catch (err) {
        console.error('Erro em create-order:', err);
        return res.status(500).json({ error: 'Erro ao criar o pedido. Tente novamente.' });
    }
};
