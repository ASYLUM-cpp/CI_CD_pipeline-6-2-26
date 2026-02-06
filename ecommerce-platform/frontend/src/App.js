// ============================================================
// Main App Component
// Provides routing to Products, Orders, Login, and Register pages.
// Manages JWT auth state and passes token via context.
// ============================================================
import React, { useState, createContext } from 'react';
import { Routes, Route, Link, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Products from './pages/Products';
import Orders from './pages/Orders';
import './App.css';

// Auth context to share JWT token across components
export const AuthContext = createContext(null);

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(null);

  // Save token to localStorage and state
  const login = (jwt, userData) => {
    localStorage.setItem('token', jwt);
    setToken(jwt);
    setUser(userData);
  };

  // Clear auth state on logout
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      <div className="app">
        <nav className="navbar">
          <Link to="/" className="brand">🛒 E-Commerce</Link>
          <div className="nav-links">
            <Link to="/products">Products</Link>
            {token ? (
              <>
                <Link to="/orders">Orders</Link>
                <button onClick={logout} className="btn-logout">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login">Login</Link>
                <Link to="/register">Register</Link>
              </>
            )}
          </div>
        </nav>

        <main className="container">
          <Routes>
            <Route path="/" element={<Products />} />
            <Route path="/products" element={<Products />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/orders" element={
              token ? <Orders /> : <Navigate to="/login" />
            } />
          </Routes>
        </main>
      </div>
    </AuthContext.Provider>
  );
}

export default App;
