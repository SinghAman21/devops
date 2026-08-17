# Mini Order Processing System

A small, intentionally simple order tracker built with **Node.js**, **Express**, and **SQLite**.

It lets you create orders, list them, view a single order, and manually move an order through its lifecycle statuses (e.g. `PENDING` -> `PAYMENT_COMPLETED` -> `INVENTORY_RESERVED` -> `CONFIRMED`). There is a plain HTML/JS frontend, plus a small JSON API.

> **Note:** This project is deliberately simple on purpose. It is a starting point that will later be extended with Kafka (for payment/inventory workers), Kubernetes, observability, and CI/CD.

## Project structure

```
mini-order-system/
  package.json
  README.md
  .env.example
  schema.sql
  orders.db            (created automatically on first run)
  src/
    server.js          Express app: middleware, static files, route wiring
    db.js              SQLite connection + schema loading
    orders.js          Order routes + validation
    config/
      index.js         Environment variable configuration
    logger/
      index.js         Pino structured logging
    middleware/
      requestId.js     X-Request-ID tracking
      errorHandler.js  Centralized error handling
      validate.js      Zod schema validation
  public/
    index.html         Frontend page
    styles.css         Frontend styling
    app.js             Frontend logic (fetch calls)
```

## Requirements

- Node.js 18 or newer (uses built-in `crypto.randomUUID()`)

## Install dependencies

```bash
pnpm install
```

## Environment variables

Copy `.env.example` to `.env` and adjust as needed:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | `development` enables pretty logs |
| `LOG_LEVEL` | `info` | Log level (`debug`, `info`, `warn`, `error`) |
| `DATABASE_PATH` | `./orders.db` | SQLite database file path |
| `KAFKA_BROKERS` | `localhost:9092` | Comma-separated Kafka brokers |
| `KAFKA_TOPIC` | `orders` | Kafka topic name |
| `KAFKA_GROUP_ID` | `order-service` | Kafka consumer group |
| `CORS_ORIGIN` | `*` | Allowed CORS origins |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window in ms |
| `RATE_LIMIT_MAX` | `100` | Max requests per window |

## Initialize the database

The database is initialized automatically when the server starts. You can also initialize it manually:

```bash
pnpm run init-db
```

This creates `orders.db` and applies `schema.sql` (the `orders` table and its indexes).

## Start the server

```bash
pnpm start
```

Or with auto-reload during development:

```bash
pnpm run dev
```

Then open <http://localhost:3000> for the frontend.

## API

All responses follow a standard format:

```json
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "error": { "code": "ERROR_CODE", "message": "..." } }
```

Every response includes an `X-Request-ID` header for distributed tracing.

### Health checks

```bash
# Liveness — is the process alive?
curl http://localhost:3000/healthz

# Readiness — can it accept traffic? (checks DB connection)
curl http://localhost:3000/readyz
```

### Create an order

```bash
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{"productId": "macbook-pro", "quantity": 1, "customerEmail": "aman@example.com"}'
```

Returns `201` with the created order (status `PENDING`).

### List all orders (newest first)

```bash
curl http://localhost:3000/orders
```

Returns `{ success, data: [...], meta: { total } }`.

### Get one order

```bash
curl http://localhost:3000/orders/<order-id>
```

Returns `404` if the order does not exist.

### Update an order's status (manual simulation)

```bash
curl -X PATCH http://localhost:3000/orders/<order-id>/status \
  -H "Content-Type: application/json" \
  -d '{"status": "CONFIRMED"}'
```

Valid statuses: `PENDING`, `PAYMENT_COMPLETED`, `PAYMENT_FAILED`, `INVENTORY_RESERVED`, `INVENTORY_FAILED`, `CONFIRMED`, `FAILED`.

## Order statuses

```
PENDING
  -> PAYMENT_COMPLETED | PAYMENT_FAILED
       -> INVENTORY_RESERVED | INVENTORY_FAILED
            -> CONFIRMED | FAILED
```

Status transitions are currently done manually through the API/frontend. In a later version, Kafka consumers (payment service, inventory service) will drive these transitions automatically.

## Security

- **Helmet** — Security headers (CSP, HSTS, X-Frame-Options, etc.)
- **CORS** — Configurable cross-origin resource sharing
- **Rate limiting** — 100 requests per minute (configurable)

## How it works (brief)

- `src/server.js` starts Express, initializes the database, serves the frontend from `public/`, and mounts routes with security middleware.
- `src/db.js` opens the SQLite file (`orders.db`) and executes `schema.sql` so the table always exists.
- `src/orders.js` defines the order routes with Zod validation and structured logging.
- `src/middleware/` provides request ID tracking, error handling, and input validation.
- `public/app.js` calls the API with `fetch` and renders the order list, including the status-update dropdown.

## Extending later (not yet implemented)

- Kafka topics (e.g. `orders.created`) and consumers for payment/inventory steps
- Docker image and Kubernetes manifests
- Prometheus metrics / Grafana dashboards
- CI/CD pipeline
