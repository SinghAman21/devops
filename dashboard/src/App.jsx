import { NavLink, Route, Routes } from 'react-router-dom';
import OrdersPage from './pages/OrdersPage';
import MonitorPage from './pages/MonitorPage';

export default function App() {
  return <div className="app-shell">
    <header className="topbar"><div><span className="eyebrow">MINI ORDER SYSTEM</span><h1>Control room</h1></div><nav><NavLink to="/" end>Orders</NavLink><NavLink to="/monitor">Live monitor</NavLink></nav></header>
    <main><Routes><Route path="/" element={<OrdersPage />} /><Route path="/monitor" element={<MonitorPage />} /></Routes></main>
  </div>;
}
