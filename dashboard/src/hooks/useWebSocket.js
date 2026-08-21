import { useEffect, useRef, useState } from 'react';

const MAX_EVENTS = 100;

export function useWebSocket() {
  const socket = useRef(null);
  const [infra, setInfra] = useState(null);
  const [events, setEvents] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let timer;
    let stopped = false;
    const url = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/events`;
    function connect() {
      if (stopped) return;
      const ws = new WebSocket(url);
      socket.current = ws;
      ws.onopen = () => setConnected(true);
      ws.onmessage = ({ data }) => {
        try {
          const event = JSON.parse(data);
          if (event.type === 'infra') setInfra(event.data);
          if (event.type === 'order_event') setEvents((previous) => [event, ...previous].slice(0, MAX_EVENTS));
        } catch { /* Ignore malformed events from an unavailable upstream. */ }
      };
      ws.onclose = () => { setConnected(false); if (!stopped) timer = setTimeout(connect, 3000); };
      ws.onerror = () => ws.close();
    }
    connect();
    return () => { stopped = true; clearTimeout(timer); socket.current?.close(); };
  }, []);

  return { infra, events, connected };
}
