function short(value) { return value ? `${value.slice(0, 8)}…` : '—'; }
export default function OrderHistory({ orders, loading, error }) {
  return <section className="card"><div className="page-heading"><div><h3>Order history</h3><p className="muted">Polling the existing REST endpoint every 10 seconds</p></div><span className="pill">{orders.length} orders</span></div>
    {error ? <p className="notice">{error}</p> : loading ? <p className="empty">Loading orders…</p> : <div className="table-wrap"><table className="table"><thead><tr><th>Order</th><th>User</th><th>Inventory</th><th>Qty</th><th>Total</th><th>Status</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td className="mono">#{order.id}</td><td>{order.user_name || order.user_id}</td><td>{order.inventory_name || order.inventory_id}</td><td>{order.quantity}</td><td>{order.total_cost}</td><td><span className="status">{order.status}</span></td></tr>)}</tbody></table>{!orders.length && <p className="empty">No orders yet.</p>}</div>}
  </section>;
}
