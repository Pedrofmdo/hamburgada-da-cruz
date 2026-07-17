'use strict';

// ─────────────────────────────────────────────────────────────
//  FONTE DE VERDADE DOS PREÇOS (lado do servidor)
//  Nunca confie em preço vindo do navegador — TODO cálculo de
//  total usa esta tabela. Mantenha em sincronia com
//  `menuItemsData` (script.js) sempre que mudar o cardápio.
//  Preços em CENTAVOS para evitar erro de ponto flutuante.
// ─────────────────────────────────────────────────────────────
const MENU = {
    1:  { name: 'Cheeseburger',                             priceCents: 1800 },
    2:  { name: 'Cheeseburger Bacon',                        priceCents: 2000 },
    3:  { name: 'Batata e Refrigerante',                     priceCents: 1500 },
    4:  { name: 'Batata',                                    priceCents: 800 },
    5:  { name: 'Refrigerante',                               priceCents: 800 },
    6:  { name: 'Cookie Chocochip',                           priceCents: 1400 },
    7:  { name: 'Cookie Duplochoco',                          priceCents: 1400 },
    8:  { name: 'Cookie Nutella',                             priceCents: 1800 },
    9:  { name: 'Cookie Limão Siciliano com Frutas Vermelhas', priceCents: 1800 },
    10: { name: 'Cookie Red Fruit',                           priceCents: 1800 }
};

function getMenuItem(id) {
    return Object.prototype.hasOwnProperty.call(MENU, id) ? MENU[id] : null;
}

module.exports = { MENU, getMenuItem };
