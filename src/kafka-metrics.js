const { Kafka } = require('kafkajs');
const config = require('./config');

async function getKafkaMetrics() {
  const kafka = new Kafka({ clientId: 'dashboard', brokers: config.kafka.brokers });
  const admin = kafka.admin();
  await admin.connect();
  try {
    const [cluster, topics, topicOffsets, groupOffsets] = await Promise.all([
      admin.describeCluster(), admin.listTopics(), admin.fetchTopicOffsets(),
      admin.fetchOffsets({ groupId: config.kafka.groupId }),
    ]);
    const lag = topicOffsets.map((topic) => {
      const group = groupOffsets.find((g) => g.topic === topic.topic);
      return { topic: topic.topic, partitions: topic.partitions.map((p) => {
        const currentPartition = group?.partitions.find((gp) => gp.partition === p.partition);
        const latest = Number.parseInt(p.high, 10) || 0;
        const current = Number.parseInt(currentPartition?.offset, 10) || 0;
        return { partition: p.partition, latest, current, lag: Math.max(0, latest - current) };
      }) };
    });
    return { brokers: cluster.brokers.length, topics: topics.length, lag };
  } finally {
    await admin.disconnect();
  }
}

module.exports = { getKafkaMetrics };
