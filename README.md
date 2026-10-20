# ERP Demo · Snabber Orgs

Exemplo de integração com a **API de Orgs da Snabber**, para sistemas de gestão, ERPs e
escritórios que querem receber os dados bancários dos seus clientes já organizados, sem que
eles precisem criar conta na Snabber.

Este ERP de demonstração:

- cadastra clientes na Snabber;
- gera o link para o cliente conectar o banco pelo Open Finance;
- recebe e valida os webhooks da Snabber;
- mostra contas e transações já categorizadas.

Use como ponto de partida ou como referência para a sua própria integração. A documentação
completa da API fica em `https://snabber.com.br/developers/org`, disponível depois que a sua org
estiver ativa.

## Como funciona

| Passo | Quem chama | Chave usada |
|---|---|---|
| Criar, alterar e remover clientes; trocar a chave de um cliente | seu servidor → `/api/v1/org/clients` | chave da **org** |
| Gerar o link de conexão bancária | seu servidor → `/api/v1/connect-sessions` | chave do **cliente** |
| Ler conexões, contas e transações | seu servidor → `/api/v1/connections`, `/accounts`, `/transactions` | chave do **cliente** |
| Avisar que chegaram dados novos | Snabber → seu `POST /api/webhooks/snabber` | assinatura HMAC com o segredo do webhook |

1. Para cada cliente do seu sistema, você cria um cliente na Snabber com a chave da org. A
   resposta traz a **chave de API daquele cliente**, mostrada uma única vez: guarde-a cifrada.
2. Quando o cliente quiser conectar o banco, seu servidor gera um link de uso único (válido por
   30 minutos) e abre em **nova aba**. O cliente aceita os termos, escolhe o banco e autoriza no
   app do próprio banco. Ele não cria conta na Snabber e a senha do banco nunca passa pela
   Snabber nem pelo seu sistema.
3. Ao terminar, o cliente volta para o `redirect_url` que você informou, com
   `status=success|cancelled|error` e `connection_id`.
4. A Snabber sincroniza e categoriza as transações e avisa por webhook
   (`connection.created`, `connection.updated`, `connection.error`, `transactions.created`).
   Você busca os dados com `GET /api/v1/transactions?updated_since=...`.

As chaves nunca vão para o navegador. Neste exemplo, as chaves dos clientes ficam cifradas
(AES-256-GCM) num arquivo local, `.data/db.json`, fora do git. Em produção, use o seu banco de dados.

## Pré-requisitos

- Node.js 20 ou mais novo.
- Uma conta na Snabber no plano **Ultra**, com a org ativada em `https://snabber.com.br/org`
  (cadastro da empresa ou pessoa física e aceite dos Termos para Orgs).
- Um endereço **https público** para este ERP. A Snabber só aceita https no retorno e no webhook.
  Na sua máquina, use um túnel, como o
  [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/trycloudflare/)
  (`cloudflared`) ou o ngrok.

## Rodando

1. **Instale e abra o túnel:**
   ```bash
   npm install
   npm run dev                                   # http://localhost:3200
   cloudflared tunnel --url http://localhost:3200 # em outro terminal: gera https://xxxx.trycloudflare.com
   ```
2. **Configure a org na Snabber** (`https://snabber.com.br/org`):
   - **Domínios de retorno:** o host do túnel, por exemplo `xxxx.trycloudflare.com`;
   - **Webhook:** `https://xxxx.trycloudflare.com/api/webhooks/snabber`, depois **Salvar** e
     **Gerar segredo** (copie o segredo);
   - **Chave da Org:** **Criar chave**. Um código de confirmação chega no seu e-mail; depois
     copie a chave, que só aparece uma vez.
3. **Configure este ERP:**
   ```bash
   cp .env.example .env
   ```
   Preencha `SNABBER_ORG_KEY`, `SNABBER_WEBHOOK_SECRET`, `APP_BASE_URL` (o endereço do túnel) e
   `DATA_ENCRYPTION_KEY`, e reinicie o `npm run dev`.
4. **Confira:** abra o ERP pelo endereço do túnel e vá em **Configuração**. A chave da org deve
   aparecer como válida. Na Snabber, em `/org`, clique em **Enviar evento de teste**: o evento
   aparece em **Webhooks** com a assinatura **válida**.
5. **Teste uma conexão:** **Novo cliente** (deixe **Cliente de teste** marcado) → **Conectar banco**
   → aceite os termos → escolha o **Pluggy Bank**, o banco de testes, com usuário `user-ok` e
   senha `password-ok`.
6. De volta ao ERP, a tela do cliente mostra contas e transações categorizadas. **Buscar
   novidades** traz só o que mudou desde a última busca (`updated_since`).

> O endereço do `trycloudflare.com` muda cada vez que o túnel é aberto. Quando mudar, atualize o
> domínio de retorno e o webhook em `/org` e o `APP_BASE_URL` no `.env`.

## Clientes de teste

Um cliente criado com `sandbox: true` só vê bancos de teste, e os webhooks dele chegam com
`"sandbox": true`. Cada org pode ter até 3 clientes de teste. Para conectar bancos reais, crie
um cliente sem essa opção.

## Validando o webhook

Cada evento chega com dois headers:

- `x-snabber-timestamp`: horário do envio, em segundos;
- `x-snabber-signature`: `sha256=` seguido do HMAC-SHA256, em hexadecimal, de
  `` `${timestamp}.${corpo}` `` com o segredo do webhook.

Recuse eventos com assinatura inválida ou com mais de 5 minutos. A implementação está em
[`lib/webhook.ts`](lib/webhook.ts), e o recebimento em
[`app/api/webhooks/snabber/route.ts`](app/api/webhooks/snabber/route.ts). Os eventos trazem só
ids e contagens; os dados em si você busca pela API, com a chave do cliente.

## Onde está cada parte

- [`lib/snabber.ts`](lib/snabber.ts): cliente HTTP da API (chave da org e chave do cliente).
- [`lib/actions.ts`](lib/actions.ts): criar cliente, mudar o limite de conexões, trocar a chave,
  remover conexão, buscar novidades e remover cliente.
- [`app/clientes/[id]/conectar/route.ts`](app/clientes/[id]/conectar/route.ts): gera o link de
  conexão e redireciona.
- [`app/retorno/page.tsx`](app/retorno/page.tsx): página para onde o cliente volta depois de conectar.
- [`lib/crypto.ts`](lib/crypto.ts): cifra as chaves dos clientes.

## Scripts

- `npm run dev`: desenvolvimento na porta 3200
- `npm run build` / `npm start`
- `npm run typecheck`

## Suporte

Dúvidas sobre a API ou sobre a sua org: snabbershop@gmail.com.
