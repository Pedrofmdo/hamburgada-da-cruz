'use strict';

// ─────────────────────────────────────────────────────────────
//  GET /api/order-status?id=<uuid>
//  Usado pela página de retorno (obrigado.html) para mostrar se o
//  pagamento já foi confirmado.
//
//  Público de propósito, mas devolve o MÍNIMO: status, total e
//  método. Nada de nome, telefone ou e-mail — o id é um UUID
//  aleatório, porém um link compartilhado sem querer não pode
//  virar vazamento de dado de cliente.
//
//  Quem aprova o pedido é sempre o webhook. Este endpoint só lê.
// ─────────────────────────────────────────────────────────────
const { sql } = require('@vercel/postgres');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'Método não permitido.' });
    }

    const id = String(req.query.id || '').trim();
    if (!UUID_RE.test(id)) {
        return res.status(400).json({ error: 'Pedido inválido.' });
    }

    res.setHeader('Cache-Control', 'no-store, max-age=0');

    try {
        const found = await sql`
            SELECT status, total_cents, payment_method, receipt_url
            FROM orders
            WHERE id = ${id}::uuid
        `;

        if (found.rows.length === 0) {
            return res.status(404).json({ error: 'Pedido não encontrado.' });
        }

        const o = found.rows[0];
        return res.status(200).json({
            status: o.status,
            paid: o.status === 'approved',
            total_formatted: 'R$ ' + (o.total_cents / 100).toFixed(2).replace('.', ','),
            payment_method: o.payment_method,
            receipt_url: o.receipt_url
        });
    } catch (err) {
        console.error('Erro em order-status:', err);
        return res.status(500).json({ error: 'Erro ao consultar o pedido.' });
    }
};
