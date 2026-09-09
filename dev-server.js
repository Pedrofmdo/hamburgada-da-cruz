'use strict';

// ─────────────────────────────────────────────────────────────
//  Servidor de desenvolvimento local.
//
//  Reproduz o que a Vercel faz em produção: serve os arquivos
//  estáticos e roteia /api/* para os handlers em api/.
//  Sem dependências e sem Vercel CLI — só `node dev-server.js`.
//
//  Uso:
//    node dev-server.js            → http://localhost:3000
//    PORT=4000 node dev-server.js
// ─────────────────────────────────────────────────────────────
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = parseInt(process.env.PORT, 10) || 3000;

// ── Carrega o .env (a Vercel injeta as env vars sozinha) ──
(function loadEnv() {
    const envPath = path.join(ROOT, '.env');
    if (!fs.existsSync(envPath)) {
        console.warn('⚠  .env não encontrado — as variáveis de ambiente estarão vazias.');
        return;
    }
    fs.readFileSync(envPath, 'utf8').split('\n').forEach(function (line) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const eq = trimmed.indexOf('=');
        if (eq < 1) return;
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        // Tira aspas se houver.
        if (/^".*"$/.test(value) || /^'.*'$/.test(value)) value = value.slice(1, -1);
        if (!(key in process.env)) process.env[key] = value;
    });
})();

// ── Banco local ───────────────────────────────────────────────
//  Em produção o `@vercel/postgres` fala com a Neon por HTTP, e por
//  isso NÃO conecta num Postgres comum rodando na sua máquina.
//
//  Para desenvolvimento, trocamos o módulo por um adaptador fino
//  sobre o driver `pg`. O SQL executado é exatamente o mesmo — só
//  muda o transporte. Nada disso existe em produção: o shim só é
//  instalado quando a POSTGRES_URL aponta para localhost.
(function installLocalDbShim() {
    const conn = process.env.POSTGRES_URL || '';
    if (!conn) return;
    if (!/@(localhost|127\.0\.0\.1|host\.docker\.internal)[:/]/.test(conn)) return;

    let Pool;
    try {
        Pool = require('pg').Pool;
    } catch (e) {
        console.warn('⚠  POSTGRES_URL é local mas o pacote `pg` não está instalado.');
        console.warn('   Rode: npm install --save-dev pg');
        return;
    }

    const pool = new Pool({ connectionString: conn });
    const Module = require('module');
    const originalLoad = Module._load;

    Module._load = function (request) {
        if (request === '@vercel/postgres') {
            return {
                // Mesma assinatura de template tag: sql`SELECT ... ${v}`
                sql: function (strings) {
                    const values = Array.prototype.slice.call(arguments, 1);
                    let text = '';
                    strings.forEach(function (part, i) {
                        text += part;
                        if (i < values.length) text += '$' + (i + 1);
                    });
                    return pool.query(text, values);
                }
            };
        }
        return originalLoad.apply(this, arguments);
    };

    console.log('  ⚙  Banco local via driver `pg` (shim de desenvolvimento).');
})();

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

function readBody(req) {
    return new Promise(function (resolve) {
        const chunks = [];
        req.on('data', function (c) { chunks.push(c); });
        req.on('end', function () {
            const raw = Buffer.concat(chunks).toString('utf8');
            if (!raw) return resolve({});
            try { resolve(JSON.parse(raw)); } catch (e) { resolve(raw); }
        });
    });
}

// A Vercel entrega res.status().json() — o Node puro não.
function decorate(res) {
    res.status = function (code) { res.statusCode = code; return res; };
    res.json = function (obj) {
        if (!res.headersSent) res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(obj));
        return res;
    };
    res.send = function (body) { res.end(body); return res; };
    return res;
}

async function handleApi(req, res, name, query) {
    const file = path.join(ROOT, 'api', name + '.js');

    if (!fs.existsSync(file)) {
        return res.status(404).json({ error: 'Endpoint não encontrado: /api/' + name });
    }

    // Recarrega a cada request para pegar edições sem reiniciar.
    delete require.cache[require.resolve(file)];

    let handler;
    try {
        handler = require(file);
    } catch (err) {
        console.error('Erro ao carregar', file, err);
        return res.status(500).json({ error: 'Erro ao carregar o handler: ' + err.message });
    }

    req.query = query;
    req.body = await readBody(req);

    try {
        await handler(req, res);
    } catch (err) {
        console.error('Erro no handler /api/' + name + ':', err);
        if (!res.headersSent) res.status(500).json({ error: err.message });
    }
}

function serveStatic(res, pathname) {
    let rel = decodeURIComponent(pathname);
    if (rel === '/' || rel === '') rel = '/index.html';

    // Impede sair da pasta do projeto (../../etc/passwd).
    const target = path.normalize(path.join(ROOT, rel));
    if (!target.startsWith(ROOT)) {
        res.statusCode = 403;
        return res.end('Forbidden');
    }

    fs.readFile(target, function (err, data) {
        if (err) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            return res.end('<h1>404</h1><p>Não encontrado: ' + rel + '</p>');
        }
        res.setHeader('Content-Type', MIME[path.extname(target).toLowerCase()] || 'application/octet-stream');
        res.setHeader('Cache-Control', 'no-store');
        res.end(data);
    });
}

const server = http.createServer(function (req, res) {
    decorate(res);
    // WHATWG URL: url.parse() é depreciado e tem CVEs conhecidos.
    const parsed = new URL(req.url, 'http://localhost');
    const pathname = parsed.pathname;
    const query = Object.fromEntries(parsed.searchParams);

    const started = Date.now();
    res.on('finish', function () {
        const code = res.statusCode;
        const mark = code >= 500 ? '✖' : code >= 400 ? '!' : '·';
        console.log('  ' + mark + ' ' + req.method + ' ' + pathname + '  ' + code + '  ' + (Date.now() - started) + 'ms');
    });

    if (pathname.startsWith('/api/')) {
        const name = pathname.slice(5).replace(/\/+$/, '');
        return handleApi(req, res, name, query);
    }

    serveStatic(res, pathname);
});

server.listen(PORT, function () {
    const missing = ['INFINITEPAY_HANDLE', 'POSTGRES_URL', 'ADMIN_PASSWORD']
        .filter(function (k) { return !process.env[k]; });

    console.log('');
    console.log('  Hamburgada da Cruz — servidor local');
    console.log('  ───────────────────────────────────────────');
    console.log('  Site     http://localhost:' + PORT + '/');
    console.log('  Painel   http://localhost:' + PORT + '/admin.html');
    console.log('  Retorno  http://localhost:' + PORT + '/obrigado.html');
    console.log('');

    if (missing.length) {
        console.log('  ⚠  Faltando no .env: ' + missing.join(', '));
        console.log('     O que depende dessas variáveis vai falhar.');
        console.log('');
    }
    if (!process.env.PUBLIC_BASE_URL) {
        console.log('  ℹ  PUBLIC_BASE_URL vazia: o link de pagamento é gerado,');
        console.log('     mas a InfinitePay não consegue chamar o webhook em');
        console.log('     localhost. Use um túnel para testar a confirmação.');
        console.log('');
    }
});
