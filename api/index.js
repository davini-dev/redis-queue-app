const express = require('express');
const { Queue } = require('bullmq');
const IORedis = require('ioredis');
require('dotenv').config();

const { name, version } = require('./package.json');

const app = express();
const port = process.env.PORT || 3000;

// Configuração do Redis usando URL
const redisConnection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  connectTimeout: 10000, // 10 segundos
  tls: {
    rejectUnauthorized: false // Necessário para conexões rediss:// no Render
  }
});

// Criação da fila
const myQueue = new Queue('solicitacoes', { connection: redisConnection });

app.use(express.json());

app.post('/enviar', async (req, res) => {
  try {
    const data = req.body;
    
    if (!data || Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'JSON inválido ou vazio' });
    }

    // Adiciona o trabalho à fila
    const job = await myQueue.add('processar_json', data);

    res.status(202).json({
      message: 'Solicitação recebida e enfileirada',
      jobId: job.id
    });
  } catch (error) {
    console.error('Erro ao enfileirar:', error);
    res.status(500).json({ error: 'Erro interno ao processar solicitação' });
  }
});

app.get('/', (req, res) => {
  res.status(200).json({
    service: name,
    version,
    status: 'ok',
    timestamp: new Date().toISOString()
   });
});

app.listen(port, () => {
  console.log(`API rodando em http://localhost:${port}`);
});
