const request = require('supertest');

jest.mock('bullmq', () => ({
    Queue: jest.fn().mockImplementation(() => ({
        add: jest.fn(),
    })),
}));

jest.mock('ioredis', () => {
    return jest.fn().mockImplementation(() => ({
        // Mock any methods that are called on the ioredis instance
    }));
});

const app = require('./index');

describe('API Endpoints', () => {
    it('should return service information on GET /', async () => {
        const res = await request(app).get('/');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('service');
        expect(res.body).toHaveProperty('version');
        expect(res.body).toHaveProperty('status', 'ok');
    });
});
