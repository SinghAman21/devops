import OrderForm from '../components/OrderForm';
import OrderHistory from '../components/OrderHistory';
import { useOrders } from '../hooks/useOrders';
export default function OrdersPage() { const { orders, loading, error, refresh } = useOrders(); return <><div className="page-heading"><div><p className="eyebrow">OPERATIONS / ORDERS</p><h2>Order workflow</h2><p className="muted">Create a request and watch it travel through the event pipeline.</p></div></div><div className="grid two-col"><OrderForm onCreated={refresh} /><OrderHistory orders={orders} loading={loading} error={error} /></div></>; }
