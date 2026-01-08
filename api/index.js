const express = require('express');
const { Queue } = require('bullmq');
const IORedis = require('ioredis');
require('dotenv').config();

const { name, version } = require('./package.json');

const app = express();
const port = process.env.PORT || 3000;

// Configuração do Redis
const redisConfig = process.env.REDIS_URL 
    ? process.env.REDIS_URL 
    : {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        username: process.env.REDIS_USERNAME,
        password: process.env.REDIS_PASSWORD,
    };

const redisOptions = {
    maxRetriesPerRequest: null,
    connectTimeout: 10000, // 10 segundos
};

// Configura o TLS de forma segura
if ((typeof redisConfig === 'string' && redisConfig.startsWith('rediss://')) || process.env.REDIS_TLS === 'true') {
    redisOptions.tls = {
        // Se um certificado CA for fornecido, use-o
        ca: process.env.REDIS_CA_CERT ? Buffer.from(process.env.REDIS_CA_CERT, 'base64').toString('ascii') : undefined,
        // Por padrão, rejectUnauthorized é true. Se não houver CA, ele usará as CAs do sistema.
        // Se um CA for fornecido, ele o usará para verificação.
        // Se você realmente precisar desabilitar a verificação (não recomendado),
        // defina uma variável de ambiente para isso, por exemplo, ALLOW_INSECURE_REDIS=true
        rejectUnauthorized: process.env.ALLOW_INSECURE_REDIS !== 'true',
    };
}

const redisConnection = new IORedis(redisConfig, redisOptions);

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

if (require.main === module) {
    app.listen(port, () => {
        console.log(`API rodando em http://localhost:${port}`);
    });
}

module.exports = app;
