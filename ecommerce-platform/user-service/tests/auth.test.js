// ============================================================
// User Service – Unit Tests
// Tests registration and login endpoints.
// ============================================================
const request = require('supertest');

// Mock the database and redis before requiring the app
jest.mock('pg', () => {
  const mPool = {
    connect: jest.fn().mockResolvedValue({
      query: jest.fn().mockResolvedValue({}),
      release: jest.fn(),
    }),
    query: jest.fn(),
    end: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    ping: jest.fn().mockResolvedValue('PONG'),
    disconnect: jest.fn(),
  }));
});

jest.mock('../src/messaging', () => ({
  connectRabbitMQ: jest.fn().mockResolvedValue(undefined),
  publishMessage: jest.fn().mockResolvedValue(undefined),
}));

const app = require('../src/index');
const { Pool } = require('pg');
const pool = new Pool();

describe('Auth Endpoints', () => {
  test('POST /api/auth/register – should reject invalid input', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: '', email: 'bad', password: '12' });
    expect(res.statusCode).toBe(400);
  });

  test('GET /health – should return healthy', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.service).toBe('user-service');
  });
});
