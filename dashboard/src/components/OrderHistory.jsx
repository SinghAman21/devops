function short(value) { return value ? `${value.slice(0, 8)}…` : '—'; }
export default function OrderHistory({ orders, loading, error }) {
  return <section className="card"><div className="page-heading"><div><h3>Order history</h3><p className="muted">Polling the existing REST endpoint every 10 seconds</p></div><span className="pill">{orders.length} orders</span></div>
    {error ? <p className="notice">{error}</p> : loading ? <p className="empty">Loading orders…</p> : <div className="table-wrap"><table className="table"><thead><tr><th>Order</th><th>Status</th><th>Qty</th><th>Created</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td className="mono">{short(order.id)}</td><td><span className="status">{order.status}</span></td><td>{order.quantity}</td><td className="muted">{new Date(order.created_at).toLocaleString()}</td></tr>)}</tbody></table>{!orders.length && <p className="empty">No orders yet.</p>}</div>}
  </section>;
}
