'use strict';

// ─────────────────────────────────────────────────────────────
//  Pix estático — "BR Code" / EMV QRCPS-MPM (padrão do Banco Central)
//  buildPixPayload monta a string "Copia e Cola" do Pix com valor fixo.
//  É só concatenação de campos TLV (id[2] + tamanho[2] + valor) + CRC16.
//  NENHUMA chamada de rede, conta de vendedor ou API externa.
// ─────────────────────────────────────────────────────────────

// TLV: identificador (2) + comprimento (2) + valor.
function tlv(id, value) {
    var len = String(value.length).padStart(2, '0');
    return id + len + value;
}

// Remove acentos, deixa MAIÚSCULO, mantém só A-Z 0-9 e espaço, e corta no limite.
function sanitize(text, maxLen) {
    return String(text || '')
        .normalize('NFD').replace(/[̀-ͯ]/g, '') // tira acentos (marcas combinantes)
        .toUpperCase()
        .replace(/[^A-Z0-9 ]/g, '')
        .trim()
        .slice(0, maxLen);
}

// CRC-16/CCITT-FALSE (polinômio 0x1021, valor inicial 0xFFFF).
function crc16(payload) {
    var crc = 0xFFFF;
    for (var i = 0; i < payload.length; i++) {
        crc ^= payload.charCodeAt(i) << 8;
        for (var j = 0; j < 8; j++) {
            if (crc & 0x8000) {
                crc = (crc << 1) ^ 0x1021;
            } else {
                crc = crc << 1;
            }
            crc &= 0xFFFF;
        }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
}

function buildPixPayload(opts) {
    opts = opts || {};

    var key = String(opts.key || '').trim();
    if (!key) throw new Error('PIX key ausente.');

    var merchantName = sanitize(opts.merchantName, 25) || 'RECEBEDOR';
    var merchantCity = sanitize(opts.merchantCity, 15) || 'BRASIL';

    var amountCents = parseInt(opts.amountCents, 10);
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
        throw new Error('amountCents inválido.');
    }
    // Valor em reais com ponto decimal, sem zeros à esquerda desnecessários. Ex: "42.00".
    var amount = (amountCents / 100).toFixed(2);

    // txid: alfanumérico, máx 25. Se não houver, usa "***".
    var txid = String(opts.txid || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 25);
    if (!txid) txid = '***';

    // 26 — Merchant Account Information (Pix): GUI + chave.
    var merchantAccountInfo = tlv('00', 'br.gov.bcb.pix') + tlv('01', key);

    // 62 — Additional Data Field Template: 05 = txid.
    var additionalData = tlv('05', txid);

    var payload =
        tlv('00', '01') +                    // Payload Format Indicator
        tlv('01', '12') +                    // Point of Initiation Method (uso único / valor fixo)
        tlv('26', merchantAccountInfo) +     // Merchant Account Information — Pix
        tlv('52', '0000') +                  // Merchant Category Code
        tlv('53', '986') +                   // Transaction Currency (BRL)
        tlv('54', amount) +                  // Transaction Amount
        tlv('58', 'BR') +                    // Country Code
        tlv('59', merchantName) +            // Merchant Name
        tlv('60', merchantCity) +            // Merchant City
        tlv('62', additionalData);           // Additional Data (txid)

    // 63 — CRC16 calculado sobre TODO o payload já incluindo "6304".
    payload += '6304';
    return payload + crc16(payload);
}

module.exports = { buildPixPayload };
