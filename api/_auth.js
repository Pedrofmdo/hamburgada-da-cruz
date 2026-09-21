'use strict';

// ─────────────────────────────────────────────────────────────
//  Autenticação do painel administrativo.
//  Senha única compartilhada, guardada em ADMIN_PASSWORD.
//  O front manda no header `x-admin-password`.
//
//  Comparação em tempo constante: um `===` normal para de comparar
//  no primeiro caractere diferente, e essa diferença de tempo
//  permite descobrir a senha caractere a caractere.
// ─────────────────────────────────────────────────────────────
const crypto = require('crypto');

function safeEquals(a, b) {
    const bufA = Buffer.from(String(a), 'utf8');
    const bufB = Buffer.from(String(b), 'utf8');
    // timingSafeEqual exige o mesmo tamanho, e o próprio tamanho
    // já vaza informação — por isso comparamos hashes de tamanho fixo.
    const hashA = crypto.createHash('sha256').update(bufA).digest();
    const hashB = crypto.createHash('sha256').update(bufB).digest();
    return crypto.timingSafeEqual(hashA, hashB);
}

// Retorna null se autorizado, ou { status, error } se não.
function checkAdminAuth(req) {
    const expected = process.env.ADMIN_PASSWORD;

    if (!expected) {
        console.error('ADMIN_PASSWORD não configurada — painel bloqueado.');
        return { status: 500, error: 'Painel não configurado.' };
    }
    // Sem senha definida em produção não pode virar "entra todo mundo".
    if (expected.length < 8) {
        console.error('ADMIN_PASSWORD muito curta (mínimo 8 caracteres).');
        return { status: 500, error: 'Painel não configurado.' };
    }

    const sent = req.headers['x-admin-password'];
    if (!sent || !safeEquals(sent, expected)) {
        return { status: 401, error: 'Senha inválida.' };
    }
    return null;
}

module.exports = { checkAdminAuth };
