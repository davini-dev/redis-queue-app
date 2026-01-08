const { Worker } = require('bullmq');
const IORedis = require('ioredis');
const knex = require('knex');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const logger = require('../logger');

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
      logger.info('Table "solicitacoes" created in PostgreSQL.');
    } else {
      logger.info('Table "solicitacoes" already exists.');
    }
  } catch (error) {
    logger.error({ err: error }, 'Error initializing database');
    process.exit(1);
  }
}

// Configuração do Redis
const redisPort = process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : undefined;
const redisConfig = process.env.REDIS_URL
    ? process.env.REDIS_URL
    : {
        host: process.env.REDIS_HOST,
        port: Number.isFinite(redisPort) ? redisPort : undefined,
        username: process.env.REDIS_USERNAME,
        password: process.env.REDIS_PASSWORD,
    };

if (typeof redisConfig === 'object' && redisConfig.port === undefined && process.env.REDIS_PORT) {
    logger.warn('REDIS_PORT is not a valid number and will be ignored.');
}

const redisOptions = {
    maxRetriesPerRequest: null,
    connectTimeout: 10000, // 10 segundos
};

// Se a URL começar com rediss:// ou se TLS for explicitamente necessário
if (typeof redisConfig === 'string' && redisConfig.startsWith('rediss://')) {
    redisOptions.tls = { rejectUnauthorized: false };
} else if (typeof redisConfig === 'object' && process.env.REDIS_TLS === 'true') {
    redisOptions.tls = { rejectUnauthorized: false };
}

const redisConnection = new IORedis(redisConfig, redisOptions);

// Processador da Fila
const worker = new Worker('solicitacoes', async (job) => {
  logger.info(`Processing job ${job.id}...`);

  try {
    // Insere os dados no banco de dados relacional
    await db('solicitacoes').insert({
      conteudo: job.data // Knex lida com o objeto JSON para jsonb no PG
    });

    logger.info(`Job ${job.id} processed and saved to PostgreSQL.`);
  } catch (error) {
    logger.error({ err: error }, `Error processing job ${job.id}`);
    throw error;
  }
}, { connection: redisConnection });

worker.on('completed', (job) => {
  logger.info(`Job ${job.id} completed successfully!`);
});

worker.on('failed', (job, err) => {
  logger.warn(`Job ${job.id} failed: ${err.message}`);
});

// Iniciar
initDb().then(() => {
  logger.info('Worker waiting for jobs in the "solicitacoes" queue...');
});
