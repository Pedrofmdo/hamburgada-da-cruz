'use strict';

// ─────────────────────────────────────────────────────────────
//  POST /api/create-order
//  Recebe { items: [{id, quantity}], customer: {...} }.
//  - Recalcula o total no servidor (ignora qualquer preço do cliente).
//  - Cria o pedido no Postgres com status "pending".
//  - Gera o link do Checkout Integrado da InfinitePay (Pix ou cartão).
//  - Devolve { order_id, checkout_url, total_formatted } para o front
//    redirecionar o cliente.
//
//  A confirmação do pagamento NÃO acontece aqui: chega depois em
//  api/infinitepay-webhook.js, que é quem marca o pedido como pago.
// ─────────────────────────────────────────────────────────────
const { sql } = require('@vercel/postgres');
const { getMenuItem } = require('./_menu');
const { createPaymentLink } = require('./_infinitepay');

const MAX_QTY_PER_ITEM = 50;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// A InfinitePay precisa de URLs absolutas para redirect e webhook.
// PUBLIC_BASE_URL manda; sem ela, deduz do próprio request (a Vercel
// preenche x-forwarded-host nos previews e em produção).
function baseUrlFrom(req) {
    const configured = String(process.env.PUBLIC_BASE_URL || '').trim().replace(/\/+$/, '');
    if (configured) return configured;

    const host = req.headers['x-forwarded-host'] || req.headers.host;
    if (!host) return null;
    const proto = req.headers['x-forwarded-proto'] || 'https';
    return proto + '://' + host;
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Método não permitido.' });
    }

    if (!process.env.INFINITEPAY_HANDLE) {
        console.error('INFINITEPAY_HANDLE não configurada.');
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

        // ── Gera o link do checkout (Pix ou cartão) ──
        // order_nsu = id do pedido, é como o webhook nos encontra depois.
        const base = baseUrlFrom(req);
        let checkoutUrl;

        try {
            checkoutUrl = await createPaymentLink({
                orderId: orderId,
                items: storedItems,
                customer: { name: name, email: email, phone: phone },
                redirectUrl: base ? base + '/obrigado.html?pedido=' + encodeURIComponent(orderId) : undefined,
                webhookUrl: base ? base + '/api/infinitepay-webhook' : undefined
            });
        } catch (err) {
            // O pedido já está no banco; marca como rejeitado para não
            // ficar "aguardando pagamento" para sempre no painel.
            console.error('Falha ao criar link na InfinitePay:', err);
            await sql`UPDATE orders SET status = 'rejected', updated_at = now() WHERE id = ${orderId}::uuid`;
            return res.status(502).json({ error: 'Não foi possível iniciar o pagamento. Tente novamente.' });
        }

        await sql`UPDATE orders SET checkout_url = ${checkoutUrl}, updated_at = now() WHERE id = ${orderId}::uuid`;

        const totalFormatted = 'R$ ' + (totalCents / 100).toFixed(2).replace('.', ',');

        return res.status(200).json({
            order_id: String(orderId),
            checkout_url: checkoutUrl,
            total_formatted: totalFormatted
        });
    } catch (err) {
        console.error('Erro em create-order:', err);
        return res.status(500).json({ error: 'Erro ao criar o pedido. Tente novamente.' });
    }
};
