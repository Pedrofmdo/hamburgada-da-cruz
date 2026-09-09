-- ═══════════════════════════════════════════════════════════
--  Migração 002 — Acompanhamento de preparo
--
--  Estado da COZINHA, separado do estado do PAGAMENTO.
--  `status` continua sendo pagamento (pending/approved/...).
--  `prep_status` é o fluxo do balcão: fila → preparo → entregue.
--
--  Idempotente: pode rodar mais de uma vez.
-- ═══════════════════════════════════════════════════════════

-- 'waiting'   = pago, ainda não começou
-- 'preparing' = na chapa
-- 'delivered' = entregue ao cliente
ALTER TABLE orders ADD COLUMN IF NOT EXISTS prep_status TEXT NOT NULL DEFAULT 'waiting';

-- Quando o estado de preparo mudou pela última vez.
-- Serve para a cozinha ver há quanto tempo um pedido está parado.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS prep_updated_at TIMESTAMPTZ;

-- Impede que um valor inesperado entre pela API.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'orders_prep_status_check'
    ) THEN
        ALTER TABLE orders
            ADD CONSTRAINT orders_prep_status_check
            CHECK (prep_status IN ('waiting', 'preparing', 'delivered'));
    END IF;
END $$;

-- A fila da cozinha é sempre "pago e ainda não entregue".
CREATE INDEX IF NOT EXISTS idx_orders_prep ON orders (prep_status, created_at DESC);
