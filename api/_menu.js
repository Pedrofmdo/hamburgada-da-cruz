'use strict';

// ─────────────────────────────────────────────────────────────
//  FONTE DE VERDADE DOS PREÇOS (lado do servidor)
//  Nunca confie em preço vindo do navegador — TODO cálculo de
//  total usa esta tabela. Mantenha em sincronia com
//  `menuItemsData` (script.js) sempre que mudar o cardápio.
//  Preços em CENTAVOS para evitar erro de ponto flutuante.
// ─────────────────────────────────────────────────────────────
const MENU = {
    1: { name: 'X-Burger Individual', priceCents: 1800 },
    2: { name: 'X-Burger Combo',      priceCents: 3200 },
    3: { name: 'X-Bacon Individual',  priceCents: 2000 },
    4: { name: 'X-Bacon Combo',       priceCents: 3500 }
};

function getMenuItem(id) {
    return Object.prototype.hasOwnProperty.call(MENU, id) ? MENU[id] : null;
}

module.exports = { MENU, getMenuItem };
