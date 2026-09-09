'use strict';

// ─────────────────────────────────────────────────────────────
//  GET /api/admin-orders
//  Lista os pedidos para o painel (admin.html).
//  Protegido por senha (header x-admin-password).
//
//  Query params:
//    ?range=today|7d|all   (padrão: today)
//    ?status=all|paid|pending  (padrão: all)
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
        const status = ['all', 'paid', 'pending'].includes(req.query.status) ? req.query.status : 'all';

        // Intervalo em horas (null = sem filtro de data).
        const hours = range === 'today' ? 24 : range === '7d' ? 168 : null;
        const onlyPaid = status === 'paid';
        const onlyPending = status === 'pending';

        // Uma query só, com os filtros neutralizados por flag —
        // evita montar SQL por concatenação (risco de injection).
        const result = await sql`
            SELECT id, items, customer_name, customer_phone, customer_email,
                   fulfillment, total_cents, status, created_at, updated_at,
                   payment_method, paid_amount_cents, installments, receipt_url
            FROM orders
            WHERE (${hours}::int IS NULL OR created_at >= now() - (${hours}::int * INTERVAL '1 hour'))
              AND (${onlyPaid}::boolean = false OR status = 'approved')
              AND (${onlyPending}::boolean = false OR status = 'pending')
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
                receipt_url: r.receipt_url
            };
        });

        // Resumo do período — o painel mostra no topo.
        // Só conta faturamento do que foi realmente pago.
        const paid = orders.filter(function (o) { return o.status === 'approved'; });
        const summary = {
            total_orders: orders.length,
            paid_orders: paid.length,
            pending_orders: orders.filter(function (o) { return o.status === 'pending'; }).length,
            revenue_cents: paid.reduce(function (sum, o) { return sum + o.total_cents; }, 0)
        };

        return res.status(200).json({ orders: orders, summary: summary, range: range, status: status });
    } catch (err) {
        console.error('Erro em admin-orders:', err);
        return res.status(500).json({ error: 'Erro ao carregar os pedidos.' });
    }
};
