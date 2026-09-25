-- ═══════════════════════════════════════════════════════════
--  Migração 003 — Disponibilidade dos itens
--
--  Permite esgotar/reativar um item pelo painel, sem deploy.
--
--  O cardápio (nomes e preços) continua no código, em
--  api/_menu.js: é a fonte de verdade do preço e não pode ser
--  alterada por ninguém de fora. Aqui fica só o liga/desliga.
--
--  Item que não estiver nesta tabela é considerado DISPONÍVEL,
--  então não é preciso semear nada: um item novo já nasce à venda.
--
--  Idempotente: pode rodar mais de uma vez.
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS menu_availability (
    item_id    INTEGER PRIMARY KEY,
    available  BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
