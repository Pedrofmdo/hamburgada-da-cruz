'use strict';

// ─────────────────────────────────────────────────────────────
//  /api/admin-menu — aba "Itens" do painel
//
//  GET  → lista o cardápio com o estado de cada item
//  POST → { id, available: true|false } liga ou esgota um item
//
//  Protegido pela senha do painel. Só mexe no liga/desliga:
//  nome e preço continuam no código, fora do alcance da tela.
// ─────────────────────────────────────────────────────────────
const { MENU, getMenuItem } = require('./_menu');
const { mapaDisponibilidade, definirDisponibilidade } = require('./_availability');
const { checkAdminAuth } = require('./_auth');

module.exports = async (req, res) => {
    const denied = checkAdminAuth(req);
    if (denied) {
        return res.status(denied.status).json({ error: denied.error });
    }

    res.setHeader('Cache-Control', 'no-store, max-age=0');

    try {
        if (req.method === 'GET') {
            const mapa = await mapaDisponibilidade();

            const itens = Object.keys(MENU).map(function (chave) {
                const id = Number(chave);
                const estado = mapa[id];
                return {
                    id: id,
                    name: MENU[id].name,
                    price_cents: MENU[id].priceCents,
                    available: estado ? estado.available : true,  // ausente = à venda
                    updated_at: estado ? estado.updated_at : null
                };
            });

            return res.status(200).json({
                itens: itens,
                esgotados: itens.filter(function (i) { return !i.available; }).length
            });
        }

        if (req.method === 'POST') {
            const body = req.body || {};
            const id = parseInt(body.id, 10);
            const disponivel = body.available;

            if (!Number.isInteger(id) || !getMenuItem(id)) {
                return res.status(400).json({ error: 'Item inválido.' });
            }
            if (typeof disponivel !== 'boolean') {
                return res.status(400).json({ error: 'Estado inválido.' });
            }

            const linha = await definirDisponibilidade(id, disponivel);
            console.log('Item', id, MENU[id].name, disponivel ? 'à venda' : 'ESGOTADO');

            return res.status(200).json({
                ok: true,
                id: Number(linha.item_id),
                available: linha.available,
                updated_at: linha.updated_at
            });
        }

        res.setHeader('Allow', 'GET, POST');
        return res.status(405).json({ error: 'Método não permitido.' });
    } catch (err) {
        console.error('Erro em admin-menu:', err);
        return res.status(500).json({ error: 'Erro ao carregar os itens.' });
    }
};
