'use strict';

// ─────────────────────────────────────────────────────────────
//  POST /api/admin-cancel-order
//  Body: { id: "<uuid>" }  ou  { todos_antigos: true }
//
//  Cancela pedido que ficou parado esperando pagamento.
//
//  ── Duas travas ──
//  1. Só cancela quem está `pending`. Pedido já aprovado nunca
//     é tocado por aqui.
//  2. Só depois de MINUTOS_MINIMOS. O webhook da InfinitePay
//     chega em segundos; a espera evita cancelar alguém que está
//     com o app do banco aberto, no meio do pagamento.
//
//  Cancelar aqui é uma anotação nossa: NÃO estorna nada e não
//  fala com a InfinitePay. Se o pagamento cair depois, o webhook
//  encontra o pedido e o marca como pago normalmente — ou seja,
//  um cancelamento errado se conserta sozinho.
// ─────────────────────────────────────────────────────────────
const { sql } = require('@vercel/postgres');
const { checkAdminAuth } = require('./_auth');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MINUTOS_MINIMOS = 10;

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Método não permitido.' });
    }

    const denied = checkAdminAuth(req);
    if (denied) {
        return res.status(denied.status).json({ error: denied.error });
    }

    res.setHeader('Cache-Control', 'no-store, max-age=0');

    const body = req.body || {};

    try {
        // ── Cancelar todos os antigos de uma vez ──
        if (body.todos_antigos === true) {
            const r = await sql`
                UPDATE orders
                SET status = 'rejected', updated_at = now()
                WHERE status = 'pending'
                  AND created_at <= now() - (${MINUTOS_MINIMOS}::int * INTERVAL '1 minute')
                RETURNING id
            `;
            console.log('Cancelados em lote:', r.rows.length);
            return res.status(200).json({ ok: true, cancelados: r.rows.length });
        }

        // ── Cancelar um pedido ──
        const id = String(body.id || '').trim();
        if (!UUID_RE.test(id)) {
            return res.status(400).json({ error: 'Pedido inválido.' });
        }

        const r = await sql`
            UPDATE orders
            SET status = 'rejected', updated_at = now()
            WHERE id = ${id}::uuid
              AND status = 'pending'
              AND created_at <= now() - (${MINUTOS_MINIMOS}::int * INTERVAL '1 minute')
            RETURNING id
        `;

        if (r.rows.length === 0) {
            // Não cancelou: descobre o porquê para avisar direito.
            const atual = await sql`
                SELECT status,
                       EXTRACT(EPOCH FROM (now() - created_at))::int AS segundos
                FROM orders WHERE id = ${id}::uuid
            `;
            if (atual.rows.length === 0) {
                return res.status(404).json({ error: 'Pedido não encontrado.' });
            }
            const linha = atual.rows[0];
            if (linha.status === 'approved') {
                return res.status(409).json({ error: 'Esse pedido foi pago. Não dá para cancelar.' });
            }
            if (linha.status !== 'pending') {
                return res.status(409).json({ error: 'Esse pedido já não está aguardando.' });
            }
            const faltam = Math.max(1, Math.ceil((MINUTOS_MINIMOS * 60 - linha.segundos) / 60));
            return res.status(409).json({
                error: 'Muito recente. Aguarde ' + faltam + ' min — o cliente pode estar pagando agora.'
            });
        }

        console.log('Pedido cancelado:', id);
        return res.status(200).json({ ok: true, id: id });
    } catch (err) {
        console.error('Erro em admin-cancel-order:', err);
        return res.status(500).json({ error: 'Erro ao cancelar o pedido.' });
    }
};
