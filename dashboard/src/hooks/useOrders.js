import { useCallback, useEffect, useState } from 'react';

export function useOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/orders');
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.error?.message || 'Could not load orders');
      setOrders(body.data);
      setError('');
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { refresh(); const timer = setInterval(refresh, 10000); return () => clearInterval(timer); }, [refresh]);
  return { orders, loading, error, refresh };
}
