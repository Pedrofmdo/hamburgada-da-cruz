'use strict';

// ─────────────────────────────────────────────────────────────
//  POST /api/infinitepay-webhook
//  Recebe a notificação de pagamento da InfinitePay.
//
//  ── Por que o corpo do webhook NÃO é confiável ──
//  A InfinitePay não assina o webhook (não há HMAC nem segredo
//  compartilhado). Qualquer um que descubra esta URL poderia
//  postar "pago" e liberar um pedido de graça.
//
//  Por isso o corpo recebido serve só para saber QUAL pedido
//  conferir. Quem decide se está pago é o /payment_check, e o
//  valor é comparado com o total gravado no nosso banco.
//
//  ── Respostas ──
//  200 = processado (a InfinitePay para de reenviar)
//  400 = falhou, pode reenviar depois
// ─────────────────────────────────────────────────────────────
const { sql } = require('@vercel/postgres');
const { checkPayment } = require('./_infinitepay');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Método não permitido.' });
    }

    const body = req.body || {};
    const orderNsu = body.order_nsu;
    const transactionNsu = body.transaction_nsu;
    const invoiceSlug = body.invoice_slug;

    if (!orderNsu) {
        // Sem identificação do pedido não há o que reprocessar:
        // devolver 400 só faria a InfinitePay reenviar para sempre.
        console.error('Webhook sem order_nsu:', JSON.stringify(body).slice(0, 500));
        return res.status(200).json({ ok: true, ignored: 'sem order_nsu' });
    }

    try {
        // ── 1. O pedido existe? ──
        const found = await sql`
            SELECT id, total_cents, status
            FROM orders
            WHERE id = ${String(orderNsu)}::uuid
        `;

        if (found.rows.length === 0) {
            console.error('Webhook para pedido inexistente:', orderNsu);
            return res.status(200).json({ ok: true, ignored: 'pedido inexistente' });
        }

        const order = found.rows[0];

        // Idempotência: a InfinitePay pode reenviar o mesmo webhook.
        if (order.status === 'approved') {
            return res.status(200).json({ ok: true, already: 'approved' });
        }

        // ── 2. Confirmar na fonte, não no corpo recebido ──
        const check = await checkPayment({
            orderNsu: orderNsu,
            transactionNsu: transactionNsu,
            slug: invoiceSlug
        });

        if (!check.paid) {
            // Não é erro: pode ser webhook forjado, ou chegar antes
            // da confirmação. 400 faz a InfinitePay tentar de novo.
            console.warn('payment_check negou o pagamento do pedido', orderNsu, check.raw);
            return res.status(400).json({ ok: false, error: 'pagamento não confirmado' });
        }

        // ── 3. O valor pago cobre o pedido? ──
        // Com repasse de taxas o cliente paga MAIS que o total
        // (paid_amount > amount), então o piso é o nosso total.
        const paidCents = check.paidAmountCents != null ? check.paidAmountCents : check.amountCents;

        if (paidCents == null || paidCents < order.total_cents) {
            console.error(
                'Valor pago menor que o pedido — não aprovado.',
                'pedido=' + orderNsu, 'esperado=' + order.total_cents, 'pago=' + paidCents
            );
            return res.status(200).json({ ok: true, ignored: 'valor insuficiente' });
        }

        // ── 4. Aprovar ──
        await sql`
            UPDATE orders
            SET status              = 'approved',
                payment_method      = ${check.captureMethod},
                paid_amount_cents   = ${paidCents},
                installments        = ${check.installments},
                transaction_nsu     = ${transactionNsu || null},
                invoice_slug        = ${invoiceSlug || null},
                receipt_url         = ${body.receipt_url || null},
                updated_at          = now()
            WHERE id = ${String(orderNsu)}::uuid
        `;

        console.log('Pedido aprovado:', orderNsu, check.captureMethod, paidCents);
        return res.status(200).json({ ok: true });
    } catch (err) {
        console.error('Erro no webhook da InfinitePay:', err);
        // 400 para a InfinitePay reenviar — o pedido está pago e
        // precisa ser conciliado, então não pode ser engolido.
        return res.status(400).json({ ok: false, error: 'erro interno' });
    }
};
