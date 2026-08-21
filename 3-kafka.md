Kafka Event-Driven Refactor Plan
Architecture Overview
Current: POST /orders → DB insert (PENDING) → manual PATCH /status transitions
Target:
POST /orders → DB insert (PENDING) + emit order.created
                                         │
                    ┌────────────────────┘
                    ▼
           Payment Consumer
           (order.created)
                    │
          ┌────────┴────────┐
          ▼                 ▼
  order.payment.ok    order.payment.failed
          │                 │
          ▼                 ▼
  Inventory Consumer   Update order → PAYMENT_FAILED
  (order.payment.ok)
          │
    ┌─────┴──────┐
    ▼            ▼
order.inv.ok  order.inv.failed
    │            │
    ▼            ▼
Confirm      Update → INVENTORY_FAILED

Topics: orders.created, orders.payment, orders.inventory  
Event schema: { eventId, eventType, orderId, payload, timestamp }  
Idempotency: track processed eventId in DB to prevent duplicate processing  
DLQ: each consumer routes failed messages to <topic>.dlq

Phase 1: Kafka Infrastructure

1a. K8s — Strimzi Operator + Kafka Cluster
- Install Strimzi operator via kubectl apply of the release YAML
- Create k8s/kafka-cluster.yaml — Strimzi Kafka CRD (3 brokers for production, 1 for dev)
- Create k8s/kafka-topics.yaml — Strimzi KafkaTopic CRDs for:
  - orders.created (partitions: 3, replication: 2)
  - orders.payment (partitions: 3, replication: 2)
  - orders.inventory (partitions: 3, replication: 2)
  - orders.created.dlq, orders.payment.dlq, orders.inventory.dlq
- Update k8s/backend-configmap.yaml with KAFKA_BROKERS, KAFKA_GROUP_ID
- Update k8s/backend-secret.yaml with Kafka SASL credentials (if auth enabled)

1b. Docker Compose — Local Kafka
- Add kafka service using bitnami/kafka image in KRaft mode (no Zookeeper)
- Add kafka-ui service (provectuslabs/kafka-ui) for local topic inspection
- Pass KAFKA_BROKERS=kafka:9092 to the api service

Phase 2: Application Code

2a. Dependencies
- pnpm add kafkajs
2b. Kafka Client Module — src/kafka.js
- Singleton KafkaJS Kafka instance + Producer + consumer factory
- connectProducer() — called at startup
- disconnectProducer() — called at shutdown
- produce(topic, event) — serialize + send with orderId as partition key (ordered per order)
2c. Event Schema — src/events/schema.js
- Define event types: ORDER_CREATED, PAYMENT_COMPLETED, PAYMENT_FAILED, INVENTORY_RESERVED, INVENTORY_FAILED
- createEvent(eventType, orderId, payload) — returns { eventId: uuid, eventType, orderId, payload, timestamp }
2d. Idempotency — DB migration + src/events/idempotency.js
- Add processed_events table: event_id VARCHAR(36) PRIMARY KEY, processed_at TIMESTAMPTZ
- isAlreadyProcessed(eventId) — check if exists
- markProcessed(eventId) — insert (atomic, catches race conditions)
2e. Consumers — src/events/consumers/
- Payment Consumer (payment.consumer.js)
  - Subscribes to orders.created
  - Simulates payment processing (random pass/fail for now)
  - On success: update order → PAYMENT_COMPLETED, emit to orders.payment
  - On failure: update order → PAYMENT_FAILED, emit to orders.payment
  - DLQ: on unexpected error after retries → route to orders.created.dlq
- Inventory Consumer (inventory.consumer.js)
  - Subscribes to orders.payment (only process PAYMENT_COMPLETED events)
  - Decrements product stock atomically (UPDATE products SET stock = stock - $1 WHERE id = $2 AND stock >= $1)
  - On success: update order → INVENTORY_RESERVED, emit to orders.inventory
  - On failure (insufficient stock): update order → INVENTORY_FAILED, emit to orders.inventory
- Order Confirmation Consumer (confirmation.consumer.js)
  - Subscribes to orders.inventory
  - On INVENTORY_RESERVED: update order → CONFIRMED
  - On INVENTORY_FAILED: update order → FAILED
2f. Refactor src/orders.js
- POST /orders — after DB insert, produce ORDER_CREATED event to orders.created topic
- Remove PATCH /orders/:id/status endpoint (or deprecate it behind a feature flag)
- Keep GET /orders and GET /orders/:id unchanged
2g. Refactor src/server.js
- On startup: connectProducer(), then start consumers
- On shutdown (SIGTERM/SIGINT): disconnect producer + consumers before closing DB

Phase 3: K8s Deployment Updates

3a. Consumer Deployment — k8s/consumer-deployment.yaml
- Separate Deployment for consumers (independent scaling)
- Same image as backend, different command/args or env var (SERVICE_TYPE=consumer)
- Same ConfigMap/Secret refs for DB + Kafka config
- Liveness/readiness probes (healthcheck endpoint that checks consumer lag)
3b. ConfigMap/Secret updates
- backend-configmap.yaml: add KAFKA_BROKERS, KAFKA_GROUP_ID, KAFKA_TOPIC_*
- backend-secret.yaml: add Kafka SASL username/password (if using auth)

Phase 4: Graceful Shutdown & Observability

- Consumer: commit offsets only after successful DB write (at-least-once delivery)
- Retry: 3 attempts with exponential backoff before DLQ
- Log every event produced/consumed with orderId and eventId for traceability
- Update /readyz endpoint to also check Kafka producer connection

Files to Create
File

k8s/kafka-cluster.yaml
k8s/kafka-topics.yaml
k8s/consumer-deployment.yaml
src/kafka.js
src/events/schema.js
src/events/idempotency.js
src/events/consumers/payment.consumer.js
src/events/consumers/inventory.consumer.js
src/events/consumers/confirmation.consumer.js

Files to Modify
File
package.json
schema.sql
src/config/index.js
src/orders.js
src/server.js
k8s/backend-configmap.yaml
k8s/backend-secret.yaml
docker-compose.yml
.env.example
