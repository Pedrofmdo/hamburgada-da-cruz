'use strict';

// ─────────────────────────────────────────────────────────────
//  Disponibilidade dos itens do cardápio.
//
//  Guarda apenas o liga/desliga. Nome e preço continuam em
//  api/_menu.js, no código — é o que impede alguém de alterar
//  preço por fora.
//
//  Regra: item ausente da tabela está DISPONÍVEL. Assim um item
//  novo já entra à venda, sem precisar semear o banco.
// ─────────────────────────────────────────────────────────────
const { sql } = require('@vercel/postgres');

// ids marcados como indisponíveis. Devolve um Set de números.
//
// Se a tabela ainda não existir (migração 003 não rodada), devolve
// vazio em vez de estourar: um deploy fora de ordem não pode
// derrubar a venda do site inteiro. Qualquer outro erro sobe —
// esse sim indica banco com problema, e aí o pedido não deve seguir.
async function idsEsgotados() {
    try {
        const r = await sql`SELECT item_id FROM menu_availability WHERE available = false`;
        return new Set(r.rows.map(function (row) { return Number(row.item_id); }));
    } catch (err) {
        if (err && err.code === '42P01') { // undefined_table
            console.error('menu_availability não existe — rode migrations/003_disponibilidade.sql');
            return new Set();
        }
        throw err;
    }
}

// Liga/desliga um item.
async function definirDisponibilidade(itemId, disponivel) {
    const r = await sql`
        INSERT INTO menu_availability (item_id, available, updated_at)
        VALUES (${itemId}, ${disponivel}, now())
        ON CONFLICT (item_id)
        DO UPDATE SET available = EXCLUDED.available, updated_at = now()
        RETURNING item_id, available, updated_at
    `;
    return r.rows[0];
}

// Mapa completo id -> { available, updated_at }, para o painel.
async function mapaDisponibilidade() {
    const r = await sql`SELECT item_id, available, updated_at FROM menu_availability`;
    const mapa = {};
    r.rows.forEach(function (row) {
        mapa[Number(row.item_id)] = { available: row.available, updated_at: row.updated_at };
    });
    return mapa;
}

module.exports = { idsEsgotados, definirDisponibilidade, mapaDisponibilidade };
