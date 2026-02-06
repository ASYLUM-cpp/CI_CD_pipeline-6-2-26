// ============================================================
// Orders Page
// Lists all orders for the authenticated user from order-service.
// ============================================================
import React, { useEffect, useState } from 'react';
import { orderAPI } from '../api';

function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    orderAPI.get('/orders')
      .then((res) => setOrders(res.data))
      .catch((err) => console.error('Failed to fetch orders:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading orders...</p>;

  return (
    <div>
      <h2 style={{ marginBottom: '1rem' }}>My Orders</h2>
      {orders.length === 0 ? (
        <p>No orders yet.</p>
      ) : (
        orders.map((order) => (
          <div key={order.id} className="card">
            <h3>Order #{order.id}</h3>
            <p>Status: <strong>{order.status}</strong></p>
            <p>Total: <strong>${order.total}</strong></p>
            <p>Created: {new Date(order.created_at).toLocaleDateString()}</p>
            <h4>Items:</h4>
            <ul>
              {order.items?.map((item, idx) => (
                <li key={idx}>
                  Product #{item.product_id} × {item.quantity} — ${item.price}
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}

export default Orders;
