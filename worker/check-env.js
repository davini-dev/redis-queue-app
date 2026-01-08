const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log('DATABASE_URL starts with:', process.env.DATABASE_URL && process.env.DATABASE_URL.slice(0, 10));
console.log('REDIS_URL present:', Boolean(process.env.REDIS_URL));
console.log('REDIS_TLS:', process.env.REDIS_TLS);
console.log('REDIS_PORT (raw):', process.env.REDIS_PORT);
const port = process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : undefined;
console.log('REDIS_PORT (number):', port, 'typeof:', typeof port, 'isFinite:', Number.isFinite(port));
console.log('REDIS_HOST:', process.env.REDIS_HOST);
console.log('REDIS_USERNAME:', process.env.REDIS_USERNAME ? 'present' : 'missing');
console.log('REDIS_PASSWORD:', process.env.REDIS_PASSWORD ? 'present' : 'missing');
