'use strict';

// ─────────────────────────────────────────────────────────────
//  GET /api/admin-orders
//  Lista os pedidos para o painel (admin.html).
//  Protegido por senha (header x-admin-password).
//
//  Query params:
//    ?range=today|7d|all             (padrão: today)
//    ?status=all|paid|pending|queue  (padrão: all)
//
//  'queue' é a fila da cozinha: pago e ainda não entregue.
// ─────────────────────────────────────────────────────────────
const { sql } = require('@vercel/postgres');
const { checkAdminAuth } = require('./_auth');

const MAX_ROWS = 300;

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'Método não permitido.' });
    }

    const denied = checkAdminAuth(req);
    if (denied) {
        return res.status(denied.status).json({ error: denied.error });
    }

    // O painel nunca deve ser cacheado por CDN/navegador.
    res.setHeader('Cache-Control', 'no-store, max-age=0');

    try {
        const range = ['today', '7d', 'all'].includes(req.query.range) ? req.query.range : 'today';
        const status = ['all', 'paid', 'pending', 'queue', 'delivered'].includes(req.query.status)
            ? req.query.status : 'queue';

        // Intervalo em horas (null = sem filtro de data).
        const hours = range === 'today' ? 24 : range === '7d' ? 168 : null;
        const onlyPaid = status === 'paid';
        const onlyPending = status === 'pending';
        // Fila da cozinha: pago e ainda não entregue.
        const onlyQueue = status === 'queue';
        const onlyDelivered = status === 'delivered';

        // Uma query só, com os filtros neutralizados por flag —
        // evita montar SQL por concatenação (risco de injection).
        const result = await sql`
            SELECT id, items, customer_name, customer_phone, customer_email,
                   fulfillment, total_cents, status, created_at, updated_at,
                   payment_method, paid_amount_cents, installments, receipt_url,
                   prep_status, prep_updated_at
            FROM orders
            WHERE (${hours}::int IS NULL OR created_at >= now() - (${hours}::int * INTERVAL '1 hour'))
              AND (${onlyPaid}::boolean = false OR status = 'approved')
              AND (${onlyPending}::boolean = false OR status = 'pending')
              AND (${onlyQueue}::boolean = false OR (status = 'approved' AND prep_status <> 'delivered'))
              AND (${onlyDelivered}::boolean = false OR (status = 'approved' AND prep_status = 'delivered'))
            ORDER BY created_at DESC
            LIMIT ${MAX_ROWS}
        `;

        const orders = result.rows.map(function (r) {
            return {
                id: String(r.id),
                short_id: String(r.id).slice(0, 8),
                items: r.items,
                customer_name: r.customer_name,
                customer_phone: r.customer_phone,
                customer_email: r.customer_email,
                fulfillment: r.fulfillment,
                total_cents: r.total_cents,
                status: r.status,
                created_at: r.created_at,
                updated_at: r.updated_at,
                payment_method: r.payment_method,
                paid_amount_cents: r.paid_amount_cents,
                installments: r.installments,
                receipt_url: r.receipt_url,
                prep_status: r.prep_status || 'waiting',
                prep_updated_at: r.prep_updated_at
            };
        });

        // ── Resumo do PERÍODO, não da aba aberta ──
        //  Contado no banco, ignorando o filtro de status: senão, abrir
        //  a aba "Entregues" faria o painel dizer que só existem
        //  entregues. Também não sofre com o LIMIT da listagem.
        const counts = await sql`
            SELECT
                count(*)::int AS total,
                count(*) FILTER (WHERE status = 'approved')::int AS paid,
                count(*) FILTER (WHERE status = 'pending')::int AS pending,
                count(*) FILTER (WHERE status = 'approved' AND prep_status <> 'delivered')::int AS queue,
                count(*) FILTER (WHERE status = 'approved' AND prep_status = 'preparing')::int AS preparing,
                count(*) FILTER (WHERE status = 'approved' AND prep_status = 'delivered')::int AS delivered,
                COALESCE(sum(total_cents) FILTER (WHERE status = 'approved'), 0)::int AS revenue_cents
            FROM orders
            WHERE (${hours}::int IS NULL OR created_at >= now() - (${hours}::int * INTERVAL '1 hour'))
        `;
        const c = counts.rows[0];

        const summary = {
            total_orders: c.total,
            paid_orders: c.paid,
            pending_orders: c.pending,
            revenue_cents: c.revenue_cents,
            queue_orders: c.queue,
            preparing_orders: c.preparing,
            delivered_orders: c.delivered,
            // Avisa o painel quando a listagem foi cortada pelo limite.
            truncated: orders.length >= MAX_ROWS
        };

        return res.status(200).json({ orders: orders, summary: summary, range: range, status: status });
    } catch (err) {
        console.error('Erro em admin-orders:', err);
        return res.status(500).json({ error: 'Erro ao carregar os pedidos.' });
    }
};
