// ============================================================
// RabbitMQ Messaging for Product Service
// Identical pattern to user-service messaging module.
// ============================================================
const amqp = require('amqplib');

let channel = null;
const EXCHANGE = 'ecommerce_events';

async function connectRabbitMQ() {
  try {
    const url = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
    const connection = await amqp.connect(url);
    channel = await connection.createChannel();
    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
    console.log('✅ Connected to RabbitMQ');
    connection.on('close', () => setTimeout(connectRabbitMQ, 5000));
  } catch (err) {
    console.error('RabbitMQ connection failed:', err.message);
    setTimeout(connectRabbitMQ, 5000);
  }
}

async function publishMessage(routingKey, data) {
  if (!channel) return;
  channel.publish(EXCHANGE, routingKey, Buffer.from(JSON.stringify(data)), { persistent: true });
}

async function subscribe(routingKey, handler) {
  if (!channel) return;
  const q = await channel.assertQueue('', { exclusive: true });
  await channel.bindQueue(q.queue, EXCHANGE, routingKey);
  channel.consume(q.queue, (msg) => {
    if (msg) { handler(JSON.parse(msg.content.toString())); channel.ack(msg); }
  });
}

module.exports = { connectRabbitMQ, publishMessage, subscribe };
