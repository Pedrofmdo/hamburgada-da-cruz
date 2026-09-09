-- ═══════════════════════════════════════════════════════════
--  Migração 001 — InfinitePay
--
--  Troca as colunas órfãs da era Mercado Pago (mp_preference_id,
--  mp_payment_id — nunca usadas) pelos campos do Checkout
--  Integrado, e guarda o que o pagamento devolve.
--
--  Idempotente: pode rodar mais de uma vez sem quebrar.
--  Rode DEPOIS do schema.sql. Veja SETUP.md.
-- ═══════════════════════════════════════════════════════════

-- ── Remove o que sobrou do Mercado Pago ──
ALTER TABLE orders DROP COLUMN IF EXISTS mp_preference_id;
ALTER TABLE orders DROP COLUMN IF EXISTS mp_payment_id;

-- ── Campos do pagamento InfinitePay ──
-- 'pix' | 'credit_card' — vem do capture_method
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method    TEXT;
-- Quanto o cliente pagou de fato. Com repasse de taxas fica
-- MAIOR que total_cents (o cliente paga o custo do parcelamento).
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_amount_cents INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS installments      SMALLINT;
-- Identificadores da InfinitePay, para conciliação e suporte.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS transaction_nsu   TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_slug      TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS receipt_url       TEXT;
-- Link do checkout gerado, para reabrir um pedido pendente.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS checkout_url      TEXT;

-- ── Índice para o webhook achar o pedido rápido ──
CREATE INDEX IF NOT EXISTS idx_orders_transaction_nsu ON orders (transaction_nsu);

-- ── Coluna legada: nunca houve entrega, sempre NULL ──
ALTER TABLE orders DROP COLUMN IF EXISTS address;
