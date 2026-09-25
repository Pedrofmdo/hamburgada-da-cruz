'use strict';

// ─────────────────────────────────────────────────────────────
//  GET /api/menu-status
//  Público. Diz quais itens estão esgotados agora.
//
//  O cardápio continua vindo do próprio site (script.js), então
//  ele aparece na hora, sem esperar rede. Esta consulta só marca
//  o que acabou. Se falhar, o site segue mostrando tudo — e quem
//  barra o pedido de um item esgotado é o servidor, no
//  create-order. A tela nunca é a única defesa.
// ─────────────────────────────────────────────────────────────
const { idsEsgotados } = require('./_availability');

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'Método não permitido.' });
    }

    // Durante o evento isso muda a qualquer momento: nada de cache.
    res.setHeader('Cache-Control', 'no-store, max-age=0');

    try {
        const esgotados = await idsEsgotados();
        return res.status(200).json({ esgotados: Array.from(esgotados) });
    } catch (err) {
        console.error('Erro em menu-status:', err);
        // Falhou? Melhor não esconder nada do que esconder errado.
        return res.status(200).json({ esgotados: [], erro: true });
    }
};
