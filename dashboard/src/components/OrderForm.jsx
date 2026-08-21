import { useState } from 'react';

export default function OrderForm({ onCreated }) {
  const [form, setForm] = useState({ userId: '', inventoryId: '', quantity: 1 });
  const [state, setState] = useState({ busy: false, error: '', success: '' });
  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  async function submit(event) {
    event.preventDefault(); setState({ busy: true, error: '', success: '' });
    try {
      const response = await fetch('/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: Number(form.userId), inventoryId: Number(form.inventoryId), quantity: Number(form.quantity) }) });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.error?.message || 'Order could not be created');
      setState({ busy: false, error: '', success: `Order ${body.data.id.slice(0, 8)} created` }); setForm({ userId: '', inventoryId: '', quantity: 1 }); onCreated?.();
    } catch (error) { setState({ busy: false, error: error.message, success: '' }); }
  }
  return <form className="card" onSubmit={submit}><h3>Create an order</h3>
    <div className="field"><label htmlFor="userId">User ID</label><input required min="1" type="number" id="userId" name="userId" value={form.userId} onChange={update} placeholder="e.g. 1" /></div>
    <div className="field"><label htmlFor="inventoryId">Inventory ID</label><input required min="1" type="number" id="inventoryId" name="inventoryId" value={form.inventoryId} onChange={update} placeholder="e.g. 1" /></div>
    <div className="field"><label htmlFor="quantity">Quantity</label><input required min="1" type="number" id="quantity" name="quantity" value={form.quantity} onChange={update} /></div>
    <button className="button" disabled={state.busy}>{state.busy ? 'Publishing…' : 'Create and publish order'}</button>
    {state.error && <p className="notice">{state.error}</p>}{state.success && <p className="status" style={{ marginTop: 13 }}>{state.success}</p>}
  </form>;
}
