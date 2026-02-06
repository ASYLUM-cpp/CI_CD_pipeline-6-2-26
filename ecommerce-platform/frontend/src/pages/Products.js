// ============================================================
// Products Page
// Lists all products from product-service.
// Allows adding products to an order (cart functionality).
// ============================================================
import React, { useEffect, useState, useContext } from 'react';
import { productAPI, orderAPI } from '../api';
import { AuthContext } from '../App';

function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token } = useContext(AuthContext);

  // Fetch all products on mount
  useEffect(() => {
    productAPI.get('/products')
      .then((res) => setProducts(res.data))
      .catch((err) => console.error('Failed to fetch products:', err))
      .finally(() => setLoading(false));
  }, []);

  // Create an order with a single product (simplified cart)
  const handleOrder = async (product) => {
    if (!token) {
      alert('Please login to place an order');
      return;
    }
    try {
      await orderAPI.post('/orders', {
        items: [{ product_id: product.id, quantity: 1, price: product.price }],
      });
      alert('Order placed successfully!');
    } catch (err) {
      alert('Failed to place order');
    }
  };

  if (loading) return <p>Loading products...</p>;

  return (
    <div>
      <h2 style={{ marginBottom: '1rem' }}>Products</h2>
      <div className="grid">
        {products.map((p) => (
          <div key={p.id} className="product-card">
            <h3>{p.name}</h3>
            <p>{p.description}</p>
            <p className="price">${p.price}</p>
            <p>Stock: {p.stock}</p>
            <button className="btn-primary" onClick={() => handleOrder(p)}>
              Buy Now
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Products;
