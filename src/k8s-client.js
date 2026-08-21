const k8s = require('@kubernetes/client-node');

const kc = new k8s.KubeConfig();
let coreApi;
let appsApi;
try {
  if (process.env.KUBERNETES_SERVICE_HOST) kc.loadFromCluster();
  else kc.loadFromDefault();
  coreApi = kc.makeApiClient(k8s.CoreV1Api);
  appsApi = kc.makeApiClient(k8s.AppsV1Api);
} catch (_err) {
  // Local development may not have a kubeconfig. Infra snapshots will be empty.
}

async function getDeployments(namespace) {
  if (!appsApi) return [];
  const res = await appsApi.listNamespacedDeployment(namespace);
  return res.body.items.map((d) => ({
    name: d.metadata.name,
    desired: d.spec.replicas || 0,
    ready: d.status.readyReplicas || 0,
    available: d.status.availableReplicas || 0,
  }));
}

async function getPods(namespace, labelSelector) {
  if (!coreApi) return [];
  const res = await coreApi.listNamespacedPod(namespace, undefined, undefined, undefined, undefined, labelSelector);
  return res.body.items.map((p) => ({
    name: p.metadata.name,
    status: p.status.phase,
    ready: p.status.conditions?.find((c) => c.type === 'Ready')?.status === 'True',
    restarts: p.status.containerStatuses?.[0]?.restartCount || 0,
  }));
}

async function getServices(namespace) {
  if (!coreApi) return [];
  const res = await coreApi.listNamespacedService(namespace);
  return res.body.items.map((s) => ({
    name: s.metadata.name,
    type: s.spec.type,
    clusterIP: s.spec.clusterIP,
    ports: s.spec.ports?.map((p) => ({ port: p.port, targetPort: p.targetPort })),
  }));
}

module.exports = { getDeployments, getPods, getServices };
