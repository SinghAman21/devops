function getDeployment(deployments, name) {
  return deployments.find((deployment) => deployment.name === name) || { ready: 0, desired: 0 };
}

function edgeKey(from, to) {
  return `${from}-${to}`;
}

function StageBadge({ text, x, y, width = 108 }) {
  return <g>
    <rect x={x - (width / 2)} y={y - 14} width={width} height="26" rx="13" className="flow-chip" />
    <text x={x} y={y + 4} textAnchor="middle" className="flow-chip-label">{text}</text>
  </g>;
}

function StageZone({ x, y, width, height, title }) {
  return <g>
    <rect x={x} y={y} width={width} height={height} rx="16" className="flow-zone" />
    <text x={x + 14} y={y + 22} className="flow-zone-label">{title}</text>
  </g>;
}

function renderReplicaDots(count, x, y, kind) {
  const total = Math.max(1, Math.min(count, 4));
  return Array.from({ length: total }).map((_, index) => (
    <rect
      key={`${kind}-${index}`}
      x={x - 28 + (index * 16)}
      y={y}
      width="12"
      height="12"
      rx="3"
      className={`flow-replica ${kind}`}
    />
  ));
}

export default function FlowDiagram({ events, infra, replay }) {
  const deployments = infra?.k8s?.deployments || [];
  const backend = getDeployment(deployments, 'backend');
  const payment = getDeployment(deployments, 'payment-worker');
  const inventory = getDeployment(deployments, 'inventory-worker');
  const notification = getDeployment(deployments, 'notification-worker');
  const brokerCount = Math.max(1, infra?.kafka?.brokers || 1);

  const GROUPS = {
    client: { id: 'client', label: 'Client', x: 70, y: 220, type: 'plain' },
    lb: { id: 'lb', label: 'Load balancer', x: 220, y: 220, type: 'plain' },
    ingress: { id: 'ingress', label: 'Ingress', x: 370, y: 220, type: 'plain' },
    api: { id: 'api', label: `API pods ${backend.ready}/${backend.desired}`, x: 540, y: 220, type: 'pods', replicas: backend.ready || backend.desired || 1 },
    producer: { id: 'producer', label: 'Order producer', x: 710, y: 220, type: 'plain' },
    kafka: { id: 'kafka', label: `Kafka brokers ${brokerCount}`, x: 900, y: 220, type: 'brokers', replicas: brokerCount },
    ordersCreated: { id: 'ordersCreated', label: 'orders.created', x: 1080, y: 120, type: 'topic' },
    paymentWorker: { id: 'paymentWorker', label: `Payment worker ${payment.ready}/${payment.desired}`, x: 1240, y: 120, type: 'worker', replicas: payment.ready || payment.desired || 1 },
    ordersPayment: { id: 'ordersPayment', label: 'orders.payment', x: 1080, y: 220, type: 'topic' },
    inventoryWorker: { id: 'inventoryWorker', label: `Inventory worker ${inventory.ready}/${inventory.desired}`, x: 1240, y: 220, type: 'worker', replicas: inventory.ready || inventory.desired || 1 },
    ordersInventory: { id: 'ordersInventory', label: 'orders.inventory', x: 1080, y: 320, type: 'topic' },
    notificationWorker: { id: 'notificationWorker', label: `Notification worker ${notification.ready}/${notification.desired}`, x: 1240, y: 320, type: 'worker', replicas: notification.ready || notification.desired || 1 },
    db: { id: 'db', label: 'PostgreSQL', x: 900, y: 360, type: 'db' },
  };

  const EDGES = [
    ['client', 'lb'], ['lb', 'ingress'], ['ingress', 'api'], ['api', 'producer'], ['producer', 'kafka'],
    ['kafka', 'ordersCreated'], ['ordersCreated', 'paymentWorker'], ['paymentWorker', 'ordersPayment'],
    ['ordersPayment', 'inventoryWorker'], ['inventoryWorker', 'ordersInventory'], ['ordersInventory', 'notificationWorker'],
    ['paymentWorker', 'db'], ['inventoryWorker', 'db'], ['notificationWorker', 'db'], ['kafka', 'ordersPayment'], ['kafka', 'ordersInventory'],
  ];

  const liveStageGroups = {
    created: ['client', 'lb', 'ingress', 'api', 'producer', 'kafka', 'ordersCreated'],
    payment: ['paymentWorker', 'ordersPayment', 'db'],
    inventory: ['inventoryWorker', 'ordersInventory', 'db'],
    confirmed: ['notificationWorker', 'db', 'ordersInventory'],
  };

  const byId = GROUPS;
  const replayVisited = new Set(replay?.visitedNodes || []);
  const replayCurrent = replay?.currentNode || null;
  const replayEdges = new Set(replay?.visitedEdges || []);
  const liveActive = new Set(liveStageGroups[events[0]?.stage] || []);
  const activeGroups = replay?.active ? new Set([...replayVisited, replayCurrent].filter(Boolean)) : liveActive;
  const packet = replay?.active && replayCurrent ? byId[replayCurrent] : null;
  const heading = replay?.active ? `Replaying order #${replay.orderId} · ${replay.label}` : events[0]?.stage ? `Last signal: ${events[0].stage}` : 'Listening for workflow signals';

  return <section className="card flow-card">
    <div className="page-heading">
      <div>
        <h3>Request path</h3>
        <p className="muted">{heading}</p>
      </div>
      <span className={replay?.active ? 'pill warning' : infra ? 'pill healthy' : 'pill warning'}>{replay?.active ? 'REPLAY' : infra ? 'LIVE' : 'CONNECTING'}</span>
    </div>

    <svg className="flow-svg" viewBox="0 0 1330 440" role="img" aria-label="Distributed order request flow diagram">
      <StageZone x={24} y={84} width={760} height={180} title="API request ingress path" />
      <StageZone x={800} y={84} width={196} height={300} title="Kafka brokers + topics" />
      <StageZone x={1012} y={84} width={294} height={300} title="Worker processing path" />
      <StageBadge text="Client traffic" x={220} y={64} width={126} />
      <StageBadge text="Kafka workflow" x={898} y={64} width={132} />
      <StageBadge text="Workers + DB" x={1156} y={64} width={138} />

      {EDGES.map(([from, to]) => {
        const source = byId[from];
        const target = byId[to];
        return <line key={edgeKey(from, to)} className={`flow-edge ${(replay?.active ? replayEdges.has(edgeKey(from, to)) : activeGroups.has(from) && activeGroups.has(to)) ? 'active' : ''}`} x1={source.x + 58} y1={source.y} x2={target.x - 58} y2={target.y} />;
      })}

      {Object.values(GROUPS).map((group) => (
        <g key={group.id}>
          <rect className={`flow-node ${activeGroups.has(group.id) ? 'active' : ''} ${replayCurrent === group.id ? 'current' : ''} ${group.type === 'topic' ? 'topic' : ''}`} x={group.x - 62} y={group.y - 28} width="124" height="56" rx="10" />
          <text className="flow-label" x={group.x} y={group.y - 2} textAnchor="middle">{group.label}</text>
          {group.type === 'pods' ? renderReplicaDots(group.replicas, group.x, group.y + 10, 'pod') : null}
          {group.type === 'brokers' ? renderReplicaDots(group.replicas, group.x, group.y + 10, 'broker') : null}
          {group.type === 'worker' ? renderReplicaDots(group.replicas, group.x, group.y + 10, 'worker') : null}
          {group.type === 'topic' ? <text className="flow-subtext" x={group.x} y={group.y + 14} textAnchor="middle">topic</text> : null}
        </g>
      ))}

      {packet ? <circle className="flow-packet" cx={packet.x} cy={packet.y - 40} r="8" /> : null}
    </svg>
  </section>;
}
