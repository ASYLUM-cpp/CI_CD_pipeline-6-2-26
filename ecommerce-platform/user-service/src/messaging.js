// ============================================================
// RabbitMQ Messaging Module
// Connects to RabbitMQ and provides publish/subscribe helpers.
// Used for event-driven communication between microservices.
// ============================================================
const amqp = require('amqplib');

let channel = null;
const EXCHANGE = 'ecommerce_events';

// Connect to RabbitMQ and create a topic exchange
async function connectRabbitMQ() {
  try {
    const url = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
    const connection = await amqp.connect(url);
    channel = await connection.createChannel();

    // Durable topic exchange for event routing
    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
    console.log('✅ Connected to RabbitMQ');

    // Handle connection close gracefully
    connection.on('close', () => {
      console.warn('RabbitMQ connection closed, reconnecting in 5s...');
      setTimeout(connectRabbitMQ, 5000);
    });
  } catch (err) {
    console.error('RabbitMQ connection failed:', err.message);
    console.log('Retrying in 5 seconds...');
    setTimeout(connectRabbitMQ, 5000);
  }
}

// Publish a message to the exchange with a routing key
async function publishMessage(routingKey, data) {
  if (!channel) {
    console.warn('RabbitMQ channel not ready, skipping publish');
    return;
  }
  try {
    channel.publish(
      EXCHANGE,
      routingKey,
      Buffer.from(JSON.stringify(data)),
      { persistent: true }
    );
    console.log(`📤 Published [${routingKey}]:`, data);
  } catch (err) {
    console.error('Failed to publish message:', err);
  }
}

// Subscribe to messages matching a routing key pattern
async function subscribe(routingKey, handler) {
  if (!channel) {
    console.warn('RabbitMQ channel not ready');
    return;
  }
  const q = await channel.assertQueue('', { exclusive: true });
  await channel.bindQueue(q.queue, EXCHANGE, routingKey);
  channel.consume(q.queue, (msg) => {
    if (msg) {
      const data = JSON.parse(msg.content.toString());
      handler(data);
      channel.ack(msg);
    }
  });
  console.log(`📥 Subscribed to [${routingKey}]`);
}

module.exports = { connectRabbitMQ, publishMessage, subscribe };
