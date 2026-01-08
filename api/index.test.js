const request = require('supertest');

// Mock the modules. This is hoisted by Jest.
jest.mock('bullmq');
jest.mock('ioredis');

describe('API Tests', () => {
    let app;
    const OLD_ENV = process.env;

    // This will run before each test in the 'API Endpoints' describe block
    beforeEach(() => {
        // Reset the environment and modules to ensure a clean slate
        process.env = { ...OLD_ENV };
        jest.resetModules();

        // Re-assign the mocked class to get the fresh mock instance for configuration.
        const { Queue } = require('bullmq');

        // Setup the mock BEHAVIOR before loading the app
        const mockAdd = jest.fn().mockResolvedValue({ id: 'mock-job-id' });
        Queue.mockImplementation(() => {
            return { add: mockAdd };
        });

        // Now load the app. It will use the mocks we just configured.
        app = require('./index');
    });

    afterAll(() => {
        // Restore the original environment
        process.env = OLD_ENV;
    });

    describe('API Endpoints', () => {
        it('should return service information on GET /', async () => {
            const res = await request(app).get('/');
            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('status', 'ok');
        });

        it('should enqueue a job on POST /enviar with valid data', async () => {
            const testData = { key: 'value' };
            const res = await request(app).post('/enviar').send(testData);
            expect(res.statusCode).toEqual(202);
            expect(res.body).toHaveProperty('jobId', 'mock-job-id');
        });

        it('should return 400 on POST /enviar with empty data', async () => {
            const res = await request(app).post('/enviar').send({});
            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('error', 'JSON inválido ou vazio');
        });
    });

    describe('App Initialization', () => {
        it('should configure IORedis with secure TLS options when REDIS_TLS and REDIS_CA_CERT are set', () => {
            // This test needs its own setup because of the environment variables.
            jest.resetModules();

            process.env.REDIS_TLS = 'true';
            const caCertContent = 'my-fake-ca-cert';
            process.env.REDIS_CA_CERT = Buffer.from(caCertContent).toString('base64');

            // Re-require IORedis to get the fresh mock after reset
            const IORedis = require('ioredis');

            // Load the app, which triggers the IORedis constructor call
            require('./index');

            expect(IORedis).toHaveBeenCalledTimes(1);
            const redisOptions = IORedis.mock.calls[0][1];

            expect(redisOptions.tls).toEqual({
                ca: caCertContent,
                rejectUnauthorized: true,
            });
        });
    });
});
