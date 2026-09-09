'use strict';

// ─────────────────────────────────────────────────────────────
//  Cliente do Checkout Integrado da InfinitePay.
//
//  A API é aberta: identifica a conta só pelo `handle` (InfiniteTag
//  sem o "$"). Não há OAuth nem Bearer token neste fluxo — testado
//  e confirmado contra a API real.
//
//  Docs: https://www.infinitepay.io/checkout-documentacao
// ─────────────────────────────────────────────────────────────

const BASE = 'https://api.checkout.infinitepay.io';
const TIMEOUT_MS = 12000;

function getHandle() {
    const handle = String(process.env.INFINITEPAY_HANDLE || '').trim().replace(/^\$/, '');
    if (!handle) throw new Error('INFINITEPAY_HANDLE não configurada.');
    return handle;
}

// POST com timeout — sem isso um travamento da API prende a função
// serverless até o limite da Vercel.
async function postJson(path, body) {
    const controller = new AbortController();
    const timer = setTimeout(function () { controller.abort(); }, TIMEOUT_MS);

    try {
        const res = await fetch(BASE + path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: controller.signal
        });

        let data = null;
        try { data = await res.json(); } catch (e) { data = null; }

        return { ok: res.ok, status: res.status, data: data };
    } catch (err) {
        if (err.name === 'AbortError') {
            throw new Error('A InfinitePay demorou demais para responder.');
        }
        throw err;
    } finally {
        clearTimeout(timer);
    }
}

// ── Cria o link de pagamento ──────────────────────────────────
// items: [{ name, quantity, unit_price_cents }] — o mesmo formato
// que create-order.js já monta a partir de _menu.js.
async function createPaymentLink(opts) {
    const payload = {
        handle: getHandle(),
        order_nsu: String(opts.orderId),
        items: opts.items.map(function (it) {
            return {
                quantity: it.quantity,
                price: it.unit_price_cents, // em CENTAVOS
                description: it.name
            };
        })
    };

    if (opts.redirectUrl) payload.redirect_url = opts.redirectUrl;
    if (opts.webhookUrl) payload.webhook_url = opts.webhookUrl;

    if (opts.customer) {
        payload.customer = {
            name: opts.customer.name,
            email: opts.customer.email || undefined,
            phone_number: String(opts.customer.phone || '').replace(/\D/g, '') || undefined
        };
    }

    const res = await postJson('/links', payload);

    if (!res.ok || !res.data || !res.data.url) {
        // A API devolve { success:false, error, message } nos erros.
        const detail = (res.data && (res.data.message || res.data.error)) || ('HTTP ' + res.status);
        const err = new Error('InfinitePay recusou o pedido: ' + detail);
        err.infinitepayCode = res.data && res.data.error;
        err.httpStatus = res.status;
        throw err;
    }

    return res.data.url;
}

// ── Confirma se o pagamento realmente aconteceu ───────────────
//
//  ATENÇÃO: este endpoint responde HTTP 200 mesmo quando NÃO houve
//  pagamento — devolve { "success": false } com status 200.
//  Verificado contra a API real. Por isso nunca se pode usar
//  `res.ok` como prova de pagamento; o que vale é success && paid.
//
//  Nomes de campo divergem entre webhook e payment_check:
//  o webhook manda `invoice_slug`, aqui o campo se chama `slug`.
async function checkPayment(opts) {
    const payload = { handle: getHandle() };

    if (opts.orderNsu) payload.order_nsu = String(opts.orderNsu);
    if (opts.transactionNsu) payload.transaction_nsu = String(opts.transactionNsu);
    if (opts.slug) payload.slug = String(opts.slug);

    const res = await postJson('/payment_check', payload);
    const d = res.data || {};

    return {
        paid: d.success === true && d.paid === true,
        amountCents: typeof d.amount === 'number' ? d.amount : null,
        paidAmountCents: typeof d.paid_amount === 'number' ? d.paid_amount : null,
        installments: d.installments || null,
        captureMethod: d.capture_method || null,
        raw: d
    };
}

module.exports = { createPaymentLink, checkPayment, getHandle };
