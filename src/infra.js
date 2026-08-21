const { getDeployments, getPods, getServices } = require('./k8s-client');
const { getKafkaMetrics } = require('./kafka-metrics');
const { getClientCount } = require('./ws');

const NAMESPACE = process.env.K8S_NAMESPACE || 'mini-order';

async function getInfraSnapshot() {
  const [deployments, pods, services, kafka] = await Promise.allSettled([
    getDeployments(NAMESPACE), getPods(NAMESPACE), getServices(NAMESPACE), getKafkaMetrics(),
  ]);
  return {
    timestamp: new Date().toISOString(),
    k8s: {
      namespace: NAMESPACE,
      deployments: deployments.status === 'fulfilled' ? deployments.value : [],
      pods: pods.status === 'fulfilled' ? pods.value : [],
      services: services.status === 'fulfilled' ? services.value : [],
    },
    kafka: kafka.status === 'fulfilled' ? kafka.value : { brokers: 0, topics: 0, lag: [] },
    wsClients: getClientCount(),
  };
}

module.exports = { getInfraSnapshot };
