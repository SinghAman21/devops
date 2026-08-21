export default function EventLog({ events }) {
  return <section className="card"><h3>Live event stream</h3><div className="log">{events.length ? events.map((event, index) => <div className="event" key={`${event.timestamp}-${index}`}><div><strong>{event.stage}</strong> <span className="muted">{event.status || 'published'}</span></div><span className="mono muted">{event.orderId?.slice(0, 8)} · {new Date(event.timestamp).toLocaleTimeString()}</span></div>) : <p className="empty">Waiting for order events…</p>}</div></section>;
}
