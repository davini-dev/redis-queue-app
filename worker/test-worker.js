const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const IORedis = require('ioredis');
const knex = require('knex');
const { Worker } = require('bullmq');

// PostgreSQL (Knex) configuration
const db = knex({
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  }
});

// Redis configuration (reuse same logic from index.js)
const redisPort = process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : undefined;
const redisConfig = process.env.REDIS_URL
  ? process.env.REDIS_URL
  : {
      host: process.env.REDIS_HOST,
      port: Number.isFinite(redisPort) ? redisPort : undefined,
      username: process.env.REDIS_USERNAME,
      password: process.env.REDIS_PASSWORD,
    };

const redisOptions = {
  maxRetriesPerRequest: null,
  connectTimeout: 10000,
};
if (typeof redisConfig === 'object' && process.env.REDIS_TLS === 'true') {
  redisOptions.tls = { rejectUnauthorized: false };
}

(async () => {
  console.log('Starting short-lived Worker test...');

  // Test Postgres
  try {
    const res = await db.raw('select 1+1 as result');
    const r = res.rows ? res.rows[0] : res[0];
    console.log('Postgres OK:', r);
  } catch (err) {
    console.error('Postgres connection failed:', err.message || err);
    await db.destroy();
    process.exit(1);
  }

  // Test Redis
  const redis = new IORedis(redisConfig, redisOptions);
  try {
    const pong = await redis.ping();
    console.log('Redis OK:', pong);
  } catch (err) {
    console.error('Redis connection failed:', err.message || err);
    await redis.quit().catch(() => {});
    await db.destroy();
    process.exit(1);
  }

  // Create a Worker but close it shortly after to avoid long-running processing
  const worker = new Worker('solicitacoes', async (job) => {
    // noop processor for the short test
    console.log('Processor invoked for job', job.id);
  }, { connection: redis });

  worker.on('error', (err) => console.error('Worker error:', err));

  console.log('Worker instantiated. Waiting 2 seconds before shutting down...');
  await new Promise((res) => setTimeout(res, 2000));

  try {
    await worker.close();
    console.log('Worker closed.');
  } catch (err) {
    console.warn('Error closing worker:', err.message || err);
  }

  try {
    await db.destroy();
    await redis.quit();
    console.log('Connections closed. Test complete.');
  } catch (err) {
    console.warn('Error during cleanup:', err.message || err);
  }

  process.exit(0);
})();
