# Sistema de Fila com Redis (Render) e PostgreSQL (Neon)

Este projeto foi atualizado para utilizar serviços de nuvem reais para a fila e o banco de dados.

## Estrutura do Projeto

- `api/`: API Express que recebe dados JSON e os coloca na fila Redis hospedada no Render.
- `worker/`: Aplicação que consome a fila Redis e persiste os dados no PostgreSQL hospedado no Neon.

## Configurações Atuais

As aplicações já estão configuradas nos arquivos `.env` com as seguintes URLs:

- **Redis (Render)**: `rediss://red-cv111bd6l47c73eqlh9g:Oi7bWuCHWCTxXw5dTlsUzJG9iBqSNXqe@oregon-keyvalue.render.com:6379`
- **PostgreSQL (Neon)**: `postgresql://neondb_owner:Edc4UtPXJLQ8@ep-round-term-a6e2aqdn-pooler.us-west-2.aws.neon.tech/fancy-mullet-34_db_3548118?sslmode=require&channel_binding=require`

## Como Rodar

### 1. Instalar Dependências

Em ambas as pastas (`api` e `worker`), execute:
```bash
npm install
```

### 2. Executar as Aplicações

**Terminal 1 (API):**
```bash
cd api
node index.js
```

**Terminal 2 (Worker):**
```bash
cd worker
node index.js
```

## Observação Importante sobre Segurança

Se você encontrar o erro `Client IP address is not in the allowlist`, certifique-se de:
1. No painel do **Render (Redis)**, adicionar o seu endereço IP atual à lista de permissões (Access Control).
2. No painel do **Neon (PostgreSQL)**, verificar se há restrições de IP ativas.

## Testando o Fluxo

Envie um teste via CURL:
```bash
curl -X POST http://localhost:3000/enviar \
     -H "Content-Type: application/json" \
     -d '{"usuario": "teste_real", "mensagem": "Enviando para Redis e Neon!"}'
```

O Worker deverá exibir no console:
`Job X processado e salvo no PostgreSQL.`
