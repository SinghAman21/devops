import OrderForm from '../components/OrderForm';
import OrderHistory from '../components/OrderHistory';
import EventLog from '../components/EventLog';
import FlowDiagram from '../components/FlowDiagram';
import InfraPanel from '../components/InfraPanel';
import { useOrders } from '../hooks/useOrders';
import { useWebSocket } from '../hooks/useWebSocket';

export default function OrdersPage() {
  const { orders, loading, error, refresh } = useOrders();
  const stream = useWebSocket();

  return <>
    <div className="page-heading">
      <div>
        <p className="eyebrow">OPERATIONS / ORDERS</p>
        <h2>Order workflow</h2>
        <p className="muted">Create a request and watch it travel through the event pipeline in real time.</p>
      </div>
      <span className={`pill ${stream.connected ? 'healthy' : 'warning'}`}>{stream.connected ? 'CONNECTED' : 'RECONNECTING'}</span>
    </div>

    <div className="grid two-col" style={{ marginBottom: 18 }}>
      <OrderForm onCreated={refresh} />
      <OrderHistory orders={orders} loading={loading} error={error} />
    </div>

    <div className="monitor-grid">
      <div className="grid">
        <FlowDiagram events={stream.events} infra={stream.infra} />
        <EventLog events={stream.events} />
      </div>
      <InfraPanel infra={stream.infra} />
    </div>
  </>;
}
