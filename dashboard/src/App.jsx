import { Route, Routes } from 'react-router-dom';
import OrdersPage from './pages/OrdersPage';

export default function App() {
  return <div className="app-shell">
    <header className="topbar"><div><span className="eyebrow">MINI ORDER SYSTEM</span><h1>Control room</h1></div></header>
    <main><Routes><Route path="/" element={<OrdersPage />} /><Route path="*" element={<OrdersPage />} /></Routes></main>
  </div>;
}
