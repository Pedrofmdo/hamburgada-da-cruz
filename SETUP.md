# Hamburgada da Cruz — Guia de Configuração (Pedido + Pix)

Este guia cobre o fluxo **carrinho → checkout → Pix estático**, rodando no **free tier do Vercel** com **Vercel Postgres (Neon)**.

O front continua 100% HTML/CSS/JS vanilla. O backend são funções serverless na pasta [`/api`](api/). O Pix é gerado **sem nenhuma API externa** — é só uma string formatada (padrão do Banco Central) + checksum.

---

## 1. Como funciona

1. Cliente adiciona itens ao carrinho (salvo em `localStorage`).
2. No checkout, o front chama `POST /api/create-order` mandando **só `id` e `quantidade`** — nunca o preço.
3. O servidor **recalcula o total** com a tabela confiável em [`api/_menu.js`](api/_menu.js), grava o pedido no Postgres com status `pending` e **gera o Pix Copia e Cola** com o valor exato ([`api/_pix.js`](api/_pix.js)).
4. O front recebe `{ order_id, pix_payload, total_formatted }` e renderiza o **QR Code** (lib vendorizada em [`vendor/qrcode.js`](vendor/qrcode.js), roda no navegador) + o **Copia e Cola**.
5. O cliente paga no app do banco e **envia o comprovante pelo WhatsApp**. A confirmação é **manual** (Pix estático não tem retorno automático).

> ⚠️ Como não há webhook, o pedido fica sempre `pending` no banco. A confirmação é feita por você, conferindo o comprovante recebido. Se no futuro quiser confirmação automática, é preciso um Pix **dinâmico** via PSP/banco (com API) — fora do escopo atual.

---

## 2. Variáveis de ambiente

| Variável | Para que serve | Onde configurar |
|---|---|---|
| `PIX_KEY` | Chave Pix que recebe o dinheiro (e-mail, telefone, CPF/CNPJ ou aleatória) | Vercel → Settings → Environment Variables |
| `PIX_MERCHANT_NAME` | Nome do recebedor (máx 25, sem acento) | idem |
| `PIX_MERCHANT_CITY` | Cidade do recebedor (máx 15, sem acento) | idem |
| `POSTGRES_URL` / `DATABASE_URL` | Conexão do banco | Criadas **automaticamente** pelo Storage |

O arquivo [`.env.example`](.env.example) documenta as chaves sem valores.

### Onde consigo a chave Pix
No app do seu banco: **Pix → Minhas chaves**. Use uma chave da conta que deve **receber** os pagamentos. Recomendo uma chave **aleatória** dedicada ao negócio (não expõe seu telefone/CPF no QR).

---

## 3. Configurar o banco (Vercel Postgres / Neon)

1. Projeto no Vercel → aba **Storage** → **Create Database** → **Postgres** (Neon) → free tier.
2. **Connect Project** — isso injeta `POSTGRES_URL`, `DATABASE_URL` etc. automaticamente.
3. Rode a migração de [`schema.sql`](schema.sql):
   - **Dashboard:** Storage → seu banco → aba **Query** → cole o `schema.sql` → **Run**.
   - **Neon console:** <https://console.neon.tech> → **SQL Editor** → cole e rode.
   - **Local (CLI):**
     ```bash
     npm i -g vercel
     vercel link
     vercel env pull .env   # baixa POSTGRES_URL etc.
     ```

---

## 4. Configurar as variáveis Pix no Vercel

Settings → **Environment Variables** → adicione (Production **e** Preview):
```
PIX_KEY            = sua-chave-pix
PIX_MERCHANT_NAME  = HAMBURGADA DA CRUZ
PIX_MERCHANT_CITY  = JOAO PESSOA
```
Sem `PIX_KEY`, a API responde 500 com "Pagamento indisponível no momento." (proposital).

---

## 5. Deploy

```bash
git add .
git commit -m "Pagamento via Pix estático (substitui Mercado Pago)"
git push
```
O Vercel instala [`@vercel/postgres`](package.json) e publica os arquivos estáticos + funções `/api`.

---

## 6. Testar o fluxo completo

1. Garanta que `PIX_KEY`, `PIX_MERCHANT_NAME`, `PIX_MERCHANT_CITY` e o banco estão configurados.
2. Faça o deploy (ou use a URL de Preview).
3. No site: adicione itens → carrinho → **Continuar** → preencha nome/telefone e escolha **Consumir no local** ou **Retirar no local** → **Gerar Pix do pedido**.
4. Aparece o **QR Code + Copia e Cola** com o valor. Confira no banco que o pedido foi gravado:
   ```sql
   SELECT id, customer_name, total_cents, status, created_at
   FROM orders ORDER BY created_at DESC LIMIT 5;
   ```
5. **Teste o Pix de verdade com um valor baixo:** abra o app do seu banco, escaneie o QR (ou cole o código) e confirme que:
   - o **recebedor** é a conta certa;
   - o **valor** bate exatamente com o pedido.
6. O cliente clica em **Enviar comprovante no WhatsApp** para você confirmar.

> Dica de validação técnica: o CRC16 e a montagem do payload foram checados contra o valor-cheque padrão do CRC-16/CCITT-FALSE. Qualquer app de banco que ler o QR sem erro confirma que o BR Code está válido.

---

## 7. Painel de pedidos (`/admin.html`)

Painel interno para acompanhar os pedidos. Mostra faturamento pago do periodo,
itens, cliente, telefone (link direto no WhatsApp), consumir/retirar e o status
de pagamento. Atualiza sozinho a cada 20s e da um bipe quando um pedido novo e pago.

**Acesso:** `https://seusite.com/admin.html`

**Configurar a senha:**

```bash
# gere uma senha forte
openssl rand -base64 24

# local: coloque no .env
ADMIN_PASSWORD=a_senha_gerada

# producao: Vercel > Settings > Environment Variables
```

A senha tem **minimo de 8 caracteres**. Se `ADMIN_PASSWORD` estiver vazia ou
curta demais, o painel devolve 500 e nao abre — nunca vira "entra todo mundo".

**Filtros:** Hoje / 7 dias / Tudo, cruzados com Todos / Pagos / Aguardando.

> **Atencao — enquanto o pagamento for Pix estatico, o status nunca vira `PAGO`
> sozinho.** O Pix estatico nao tem confirmacao: o dinheiro cai direto na chave
> e o banco nao avisa o sistema. Todo pedido fica `Aguardando`. A confirmacao
> automatica so passa a funcionar com o checkout da InfinitePay e o webhook.

---

## 8. InfinitePay — Checkout Integrado

O pagamento passou do **Pix estatico** para o **Checkout Integrado da InfinitePay**.
Motivo: o Pix estatico nao tinha confirmacao nenhuma (o banco nao avisa o sistema),
entao nenhum pedido conseguia virar `PAGO` sozinho. Pela InfinitePay o Pix continua
**0%** e passa a confirmar automaticamente, e o cartao entra junto.

### Fluxo

```
Cliente finaliza o pedido
  -> api/create-order.js       recalcula o total no servidor, grava 'pending',
                               pede o link a InfinitePay, devolve checkout_url
  -> cliente e redirecionado   paga com Pix ou cartao no checkout da InfinitePay
  -> api/infinitepay-webhook   confirma no /payment_check e marca 'approved'
  -> obrigado.html             consulta /api/order-status e mostra o resultado
  -> admin.html                mostra PAGO, com metodo e comprovante
```

### Configurar

1. **App InfinitePay** > Vendas > Checkout > Configuracoes > **Habilitar Checkout Integrado**
2. **Ligar o repasse de taxas** no app (Link de Pagamento > repasse). Sem isso a
   hamburgada absorve ate 16,66% num parcelamento em 12x. A API **nao permite
   limitar o numero de parcelas** — o repasse e o que protege a margem.
3. Variaveis de ambiente:

```
INFINITEPAY_HANDLE=pedro-jorge-2d8      # InfiniteTag SEM o "$"
PUBLIC_BASE_URL=https://seusite.com     # sem barra no final
```

4. Rodar a migracao do banco: [`migrations/001_infinitepay.sql`](migrations/001_infinitepay.sql)

### Autenticacao

**Nao precisa.** Testado contra a API real: o endpoint `/links` identifica a conta
so pelo `handle`. Nao ha OAuth nem Bearer token neste fluxo. (Existe uma API de
e-commerce separada em `api.infinitepay.io/v2` que usa OAuth, mas nao e necessaria
para o Checkout Integrado.)

### Armadilha do payment_check

`POST /payment_check` responde **HTTP 200 mesmo quando NAO houve pagamento** —
devolve `{"success": false}` com status 200. Nunca use `res.ok` como prova de
pagamento. O codigo checa `success === true && paid === true`
(ver [`api/_infinitepay.js`](api/_infinitepay.js)).

### Por que o webhook nao e confiavel sozinho

A InfinitePay **nao assina** o webhook (sem HMAC, sem segredo). Quem descobrisse a
URL poderia postar "pago" e liberar pedido de graca. Por isso
[`api/infinitepay-webhook.js`](api/infinitepay-webhook.js) usa o corpo recebido
apenas para saber **qual** pedido conferir, e a decisao vem do `/payment_check` +
comparacao com o total gravado no nosso banco.

### Sobre valores

Com repasse de taxas o cliente paga **mais** que o total do pedido
(`paid_amount` > `amount`). O webhook aprova quando o pago **cobre** o total, e o
painel mostra a diferenca para nao confundir na hora de bater o caixa.

---

## 9. Rodar local (sem Vercel CLI)

```bash
npm install
node dev-server.js          # http://localhost:3000
```

O [`dev-server.js`](dev-server.js) reproduz o que a Vercel faz: serve os arquivos
estaticos e roteia `/api/*` para os handlers em `api/`. Sem dependencias, sem CLI
e sem conta. Ele le o `.env` sozinho e recarrega os handlers a cada request
(editou, e so dar F5).

Precisa de um `POSTGRES_URL` valido no `.env` — qualquer Postgres serve
(Neon free, Supabase, ou um local).

### O webhook nao chega em localhost

A InfinitePay precisa de uma URL publica para confirmar o pagamento. Em
`localhost` o link e gerado e da pra pagar, mas o pedido nunca vira `PAGO`.

Para testar a confirmacao ponta a ponta, exponha o servidor local:

```bash
# tunel sem cadastro
cloudflared tunnel --url http://localhost:3000

# no .env, aponte para a URL que ele imprimir:
PUBLIC_BASE_URL=https://algo-aleatorio.trycloudflare.com
```

Reinicie o `dev-server.js` depois de mudar o `.env`.

---

## 10. Acompanhamento de preparo (cozinha)

Cada pedido **pago** ganha no painel um controle de tres estados:

```
Na fila  ->  Em preparo  ->  Entregue
```

A equipe clica direto no card. Da para voltar um estado (corrige clique errado).
O painel mostra ha quanto tempo o pedido esta no estado atual, para nao esquecerem
ninguem na fila.

### Dois eixos separados

`status` e o estado do PAGAMENTO (`pending`/`approved`/`rejected`), decidido
**apenas** pelo webhook depois de conferir na InfinitePay.

`prep_status` e o estado da COZINHA (`waiting`/`preparing`/`delivered`), decidido
pela equipe no painel.

Sao colunas diferentes de proposito: **nenhuma acao de tela pode marcar um pedido
como pago**. O endpoint so aceita pedidos que ja estao `approved`.

### Filtro "Cozinha"

O chip **Cozinha** mostra a fila real de trabalho: pago e ainda nao entregue.
E a visao que a equipe deve deixar aberta durante o evento.

### Migracao

Rode [`migrations/002_preparo.sql`](migrations/002_preparo.sql). Alem das colunas,
ele cria um CHECK constraint: um valor invalido e recusado **pelo banco**, mesmo
que alguem tente por SQL direto.

---

## Segurança (mantida)
- [x] Preço **sempre** recalculado no servidor ([`api/create-order.js`](api/create-order.js)); o cliente manda só `id`+`quantidade`.
- [x] O valor do Pix é o total calculado no servidor — o navegador não influencia o valor cobrado.
- [x] Painel protegido por senha comparada em **tempo constante** (`api/_auth.js`), para nao vazar a senha caractere a caractere pelo tempo de resposta.
- [x] Painel envia `Cache-Control: no-store` — nenhum dado de pedido fica em cache de CDN ou navegador.
- [x] Nenhum segredo no front. A `PIX_KEY` fica só no servidor (e, de qualquer forma, uma chave Pix não é secreta — serve para receber).

---

## Arquivos

| Arquivo | Papel |
|---|---|
| [`api/_menu.js`](api/_menu.js) | Tabela de preços confiável (fonte de verdade, em centavos) |
| [`api/_pix.js`](api/_pix.js) | **LEGADO** — Pix estatico, fora do fluxo desde a migracao para a InfinitePay |
| [`api/create-order.js`](api/create-order.js) | Recalcula total, grava pedido, retorna `checkout_url` |
| [`vendor/qrcode.js`](vendor/qrcode.js) | **LEGADO** — so era usado pela tela do Pix estatico |
| [`schema.sql`](schema.sql) | Tabela `orders` |
| [`package.json`](package.json) | Dependência do backend (`@vercel/postgres`) |
| [`.env.example`](.env.example) | Documentação das variáveis |
| [`api/_infinitepay.js`](api/_infinitepay.js) | Cliente do Checkout Integrado (cria link, confere pagamento) |
| [`api/infinitepay-webhook.js`](api/infinitepay-webhook.js) | Recebe a notificacao, confirma na fonte e aprova o pedido |
| [`api/order-status.js`](api/order-status.js) | Status publico e minimo de um pedido (usado pelo obrigado.html) |
| [`obrigado.html`](obrigado.html) | Pagina de retorno do checkout |
| [`migrations/001_infinitepay.sql`](migrations/001_infinitepay.sql) | Colunas de pagamento; remove sobras do Mercado Pago |
| [`dev-server.js`](dev-server.js) | Servidor local que imita a Vercel (so para desenvolvimento) |
| [`admin.html`](admin.html) | Painel de pedidos (login, filtros, auto-refresh) |
| [`api/admin-orders.js`](api/admin-orders.js) | Lista os pedidos para o painel (protegido por senha) |
| [`api/admin-update-order.js`](api/admin-update-order.js) | Muda o estado de preparo (so em pedido pago) |
| [`migrations/002_preparo.sql`](migrations/002_preparo.sql) | Colunas de preparo + CHECK constraint |
| [`api/_auth.js`](api/_auth.js) | Checagem da senha do painel, em tempo constante |
| `index.html` / `script.js` / `style.css` | Carrinho, drawer, checkout e tela do Pix |

> O WhatsApp (FAB e botões) foi **mantido** — agora também é o canal de envio de comprovante.
