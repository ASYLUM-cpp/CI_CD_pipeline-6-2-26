// Product Service – Unit Tests
jest.mock('pg', () => {
  const mPool = {
    connect: jest.fn().mockResolvedValue({ query: jest.fn().mockResolvedValue({ rows: [{ count: '5' }] }), release: jest.fn() }),
    query: jest.fn(),
    end: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});
jest.mock('ioredis', () => jest.fn().mockImplementation(() => ({
  get: jest.fn().mockResolvedValue(null), set: jest.fn(), del: jest.fn(), ping: jest.fn().mockResolvedValue('PONG'), disconnect: jest.fn(),
})));
jest.mock('../src/messaging', () => ({ connectRabbitMQ: jest.fn().mockResolvedValue(undefined), publishMessage: jest.fn() }));

const request = require('supertest');
const app = require('../src/index');
const { Pool } = require('pg');
const pool = new Pool();

describe('Product Endpoints', () => {
  test('GET /health – should return healthy', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{}] });
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.service).toBe('product-service');
  });

  test('GET /api/products – should return products', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Test', price: 10 }] });
    const res = await request(app).get('/api/products');
    expect(res.statusCode).toBe(200);
  });
});
