import { useEffect, useMemo, useState } from 'react';
import OrderForm from '../components/OrderForm';
import OrderHistory from '../components/OrderHistory';
import FlowDiagram from '../components/FlowDiagram';
import InfraPanel from '../components/InfraPanel';
import { useOrders } from '../hooks/useOrders';
import { useWebSocket } from '../hooks/useWebSocket';

const BASE_PATH = ['client', 'lb', 'ingress', 'api', 'producer', 'kafka', 'ordersCreated'];
const PAYMENT_PATH = [...BASE_PATH, 'paymentWorker', 'ordersPayment'];
const INVENTORY_PATH = [...PAYMENT_PATH, 'inventoryWorker', 'ordersInventory'];
const FINAL_PATH = [...INVENTORY_PATH, 'notificationWorker', 'db'];
const REPLAY_DELAY = 650;

function getReplayPlan(order) {
  const status = order.status;
  if (status === 'PENDING') return { label: 'created', nodes: BASE_PATH };
  if (status === 'PAYMENT_COMPLETED') return { label: 'payment', nodes: PAYMENT_PATH };
  if (status === 'PAYMENT_FAILED') return { label: 'payment failed', nodes: [...PAYMENT_PATH, 'db'] };
  if (status === 'INVENTORY_FAILED') return { label: 'inventory failed', nodes: [...INVENTORY_PATH, 'db'] };
  if (status === 'INVENTORY_RESERVED') return { label: 'inventory reserved', nodes: [...INVENTORY_PATH, 'db'] };
  if (status === 'CONFIRMED') return { label: 'confirmed', nodes: FINAL_PATH };
  if (status === 'FAILED') return { label: 'failed', nodes: [...PAYMENT_PATH, 'db'] };
  return { label: 'created', nodes: BASE_PATH };
}

export default function OrdersPage() {
  const { orders, loading, error, refresh } = useOrders();
  const stream = useWebSocket();
  const [replay, setReplay] = useState(null);

  useEffect(() => {
    if (!replay?.active) return undefined;
    if (replay.step >= replay.nodes.length - 1) {
      const done = setTimeout(() => setReplay(null), REPLAY_DELAY * 1.5);
      return () => clearTimeout(done);
    }

    const timer = setTimeout(() => {
      setReplay((current) => {
        if (!current) return current;
        const nextStep = current.step + 1;
        const visitedNodes = current.nodes.slice(0, nextStep + 1);
        const visitedEdges = current.nodes.slice(0, nextStep + 1).map((node, index) => index > 0 ? `${current.nodes[index - 1]}-${node}` : null).filter(Boolean);
        return {
          ...current,
          step: nextStep,
          currentNode: current.nodes[nextStep],
          visitedNodes,
          visitedEdges,
        };
      });
    }, REPLAY_DELAY);

    return () => clearTimeout(timer);
  }, [replay]);

  const replayOrderId = replay?.orderId || null;


  function handlePlay(order) {
    const plan = getReplayPlan(order);
    setReplay({
      active: true,
      orderId: order.id,
      status: order.status,
      label: plan.label,
      nodes: plan.nodes,
      step: 0,
      currentNode: plan.nodes[0],
      visitedNodes: [plan.nodes[0]],
      visitedEdges: [],
    });
  }

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
      <OrderHistory orders={orders} loading={loading} error={error} onPlay={handlePlay} replayOrderId={replayOrderId} />
    </div>

    <div className="monitor-grid">
      <FlowDiagram events={stream.events} infra={stream.infra} replay={replay} />
      <InfraPanel infra={stream.infra} />
    </div>
  </>;
}
