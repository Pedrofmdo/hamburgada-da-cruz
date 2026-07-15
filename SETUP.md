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
3. No site: adicione itens → carrinho → **Continuar** → preencha nome/telefone (e endereço se escolher Entrega) → **Gerar Pix do pedido**.
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

## Segurança (mantida)
- [x] Preço **sempre** recalculado no servidor ([`api/create-order.js`](api/create-order.js)); o cliente manda só `id`+`quantidade`.
- [x] O valor do Pix é o total calculado no servidor — o navegador não influencia o valor cobrado.
- [x] Nenhum segredo no front. A `PIX_KEY` fica só no servidor (e, de qualquer forma, uma chave Pix não é secreta — serve para receber).

---

## Arquivos

| Arquivo | Papel |
|---|---|
| [`api/_menu.js`](api/_menu.js) | Tabela de preços confiável (fonte de verdade, em centavos) |
| [`api/_pix.js`](api/_pix.js) | Monta o BR Code / Copia e Cola do Pix (TLV + CRC16), sem rede |
| [`api/create-order.js`](api/create-order.js) | Recalcula total, grava pedido, retorna `pix_payload` |
| [`vendor/qrcode.js`](vendor/qrcode.js) | Gerador de QR local (MIT, kazuhikoarase) — sem CDN |
| [`schema.sql`](schema.sql) | Tabela `orders` |
| [`package.json`](package.json) | Dependência do backend (`@vercel/postgres`) |
| [`.env.example`](.env.example) | Documentação das variáveis |
| `index.html` / `script.js` / `style.css` | Carrinho, drawer, checkout e tela do Pix |

> O WhatsApp (FAB e botões) foi **mantido** — agora também é o canal de envio de comprovante.
