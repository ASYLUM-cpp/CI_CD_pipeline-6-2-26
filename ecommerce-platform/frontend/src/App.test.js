// ============================================================
// Basic App test
// ============================================================
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

test('renders e-commerce nav brand', () => {
  render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
  const brand = screen.getByText(/E-Commerce/i);
  expect(brand).toBeInTheDocument();
});
