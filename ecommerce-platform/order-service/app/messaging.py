# ============================================================
# Order Service – RabbitMQ Messaging
# Publishes order events (created, updated, cancelled).
# ============================================================
import json
import aio_pika
from app.config import settings

_connection = None
_channel = None
EXCHANGE = "ecommerce_events"


async def connect_rabbitmq():
    """Establish connection to RabbitMQ and declare exchange."""
    global _connection, _channel
    try:
        _connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
        _channel = await _connection.channel()
        await _channel.declare_exchange(EXCHANGE, aio_pika.ExchangeType.TOPIC, durable=True)
        print("✅ Connected to RabbitMQ")
    except Exception as e:
        print(f"⚠️  RabbitMQ connection failed: {e}")


async def publish_message(routing_key: str, data: dict):
    """Publish a JSON message to the topic exchange."""
    if not _channel:
        print("⚠️  RabbitMQ channel not ready, skipping publish")
        return
    try:
        exchange = await _channel.get_exchange(EXCHANGE)
        message = aio_pika.Message(
            body=json.dumps(data).encode(),
            delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
        )
        await exchange.publish(message, routing_key=routing_key)
        print(f"📤 Published [{routing_key}]: {data}")
    except Exception as e:
        print(f"Failed to publish: {e}")


async def close_rabbitmq():
    """Close RabbitMQ connection gracefully."""
    if _connection:
        await _connection.close()
