const { Worker } = require('bullmq');
const IORedis = require('ioredis');
const knex = require('knex');
require('dotenv').config();

// Configuração do Banco de Dados PostgreSQL (Neon)
const db = knex({
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  }
});

// Inicialização do Banco de Dados
async function initDb() {
  try {
    const hasTable = await db.schema.hasTable('solicitacoes');
    if (!hasTable) {
      await db.schema.createTable('solicitacoes', (table) => {
        table.increments('id').primary();
        table.jsonb('conteudo'); // Usando jsonb para PostgreSQL
        table.timestamp('criado_em').defaultTo(db.fn.now());
      });
      console.log('Tabela "solicitacoes" criada no PostgreSQL.');
    } else {
      console.log('Tabela "solicitacoes" já existe.');
    }
  } catch (error) {
    console.error('Erro ao inicializar banco de dados:', error);
    process.exit(1);
  }
}

// Configuração do Redis usando URL
const redisConnection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  connectTimeout: 10000, // 10 segundos
  tls: {
    rejectUnauthorized: false
  }
});

// Processador da Fila
const worker = new Worker('solicitacoes', async (job) => {
  console.log(`Processando job ${job.id}...`);
  
  try {
    // Insere os dados no banco de dados relacional
    await db('solicitacoes').insert({
      conteudo: job.data // Knex lida com o objeto JSON para jsonb no PG
    });
    
    console.log(`Job ${job.id} processado e salvo no PostgreSQL.`);
  } catch (error) {
    console.error(`Erro ao processar job ${job.id}:`, error);
    throw error;
  }
}, { connection: redisConnection });

worker.on('completed', (job) => {
  console.log(`Job ${job.id} concluído com sucesso!`);
});

worker.on('failed', (job, err) => {
  console.log(`Job ${job.id} falhou: ${err.message}`);
});

// Iniciar
initDb().then(() => {
  console.log('Worker aguardando trabalhos na fila "solicitacoes"...');
});
