-- ═══════════════════════════════════════════════════════════
--  Hamburgada da Cruz — schema do banco (Vercel Postgres / Neon)
--  Rode este arquivo uma vez para criar a tabela de pedidos.
--  Veja SETUP.md para como executar.
-- ═══════════════════════════════════════════════════════════

-- gen_random_uuid() vem da extensão pgcrypto (já incluída no Postgres 13+).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS orders (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    items            JSONB NOT NULL,                       -- [{id, name, quantity, unit_price_cents}]
    customer_name    TEXT NOT NULL,
    customer_phone   TEXT NOT NULL,
    customer_email   TEXT,
    fulfillment      TEXT NOT NULL DEFAULT 'dinein',       -- 'dinein' (consumir no local) | 'pickup' (retirar no local)
    address          JSONB,                                -- legado: não há entrega, fica sempre NULL
    total_cents      INTEGER NOT NULL CHECK (total_cents >= 0),
    status           TEXT NOT NULL DEFAULT 'pending',      -- pending | approved | rejected | refunded
    mp_preference_id TEXT,
    mp_payment_id    TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);