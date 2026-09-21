'use strict';

// ─────────────────────────────────────────────────────────────
//  POST /api/admin-update-order
//  Body: { id: "<uuid>", prep_status: "waiting"|"preparing"|"delivered" }
//
//  Muda o estado de PREPARO de um pedido (fluxo da cozinha).
//  Protegido pela mesma senha do painel.
//
//  Nunca toca no `status` (pagamento). Quem aprova pagamento é
//  só o webhook, depois de conferir na InfinitePay — nenhuma
//  ação de tela pode marcar um pedido como pago.
// ─────────────────────────────────────────────────────────────
const { sql } = require('@vercel/postgres');
const { checkAdminAuth } = require('./_auth');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED = ['waiting', 'preparing', 'delivered'];

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Método não permitido.' });
    }

    const denied = checkAdminAuth(req);
    if (denied) {
        return res.status(denied.status).json({ error: denied.error });
    }

    const body = req.body || {};
    const id = String(body.id || '').trim();
    const prepStatus = String(body.prep_status || '').trim();

    if (!UUID_RE.test(id)) {
        return res.status(400).json({ error: 'Pedido inválido.' });
    }
    if (ALLOWED.indexOf(prepStatus) === -1) {
        return res.status(400).json({ error: 'Estado de preparo inválido.' });
    }

    res.setHeader('Cache-Control', 'no-store, max-age=0');

    try {
        // Só pedidos PAGOS entram no fluxo da cozinha. Marcar como
        // entregue algo que não foi pago esconderia um calote.
        const updated = await sql`
            UPDATE orders
            SET prep_status     = ${prepStatus},
                prep_updated_at = now(),
                updated_at      = now()
            WHERE id = ${id}::uuid
              AND status = 'approved'
            RETURNING id, prep_status, prep_updated_at
        `;

        if (updated.rows.length === 0) {
            // Ou não existe, ou ainda não foi pago.
            const exists = await sql`SELECT status FROM orders WHERE id = ${id}::uuid`;
            if (exists.rows.length === 0) {
                return res.status(404).json({ error: 'Pedido não encontrado.' });
            }
            return res.status(409).json({
                error: 'Só é possível acompanhar o preparo de pedidos já pagos.'
            });
        }

        return res.status(200).json({
            ok: true,
            id: String(updated.rows[0].id),
            prep_status: updated.rows[0].prep_status,
            prep_updated_at: updated.rows[0].prep_updated_at
        });
    } catch (err) {
        console.error('Erro em admin-update-order:', err);
        return res.status(500).json({ error: 'Erro ao atualizar o pedido.' });
    }
};
