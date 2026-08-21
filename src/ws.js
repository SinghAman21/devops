const { WebSocketServer, WebSocket } = require('ws');

let wss = null;
let heartbeat;

function initWss(server) {
  wss = new WebSocketServer({ server, path: '/ws/events' });
  wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
  });

  heartbeat = setInterval(() => {
    if (!wss) return;
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  return wss;
}

function broadcast(event) {
  if (!wss) return;
  const data = JSON.stringify(event);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(data);
  });
}

function getClientCount() {
  return wss ? wss.clients.size : 0;
}

function closeWss() {
  if (heartbeat) clearInterval(heartbeat);
  if (wss) wss.close();
  wss = null;
}

module.exports = { initWss, broadcast, getClientCount, closeWss };
