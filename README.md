# Mini Order Processing System

A small, intentionally simple order tracker built with **Node.js**, **Express**, and **SQLite**.

It lets you create orders, list them, view a single order, and manually move an order through its lifecycle statuses (e.g. `PENDING` -> `PAYMENT_COMPLETED` -> `INVENTORY_RESERVED` -> `CONFIRMED`). There is a plain HTML/JS frontend, plus a small JSON API.

> **Note:** This project is deliberately simple on purpose. It is a starting point that will later be extended with Kafka (for payment/inventory workers), Kubernetes, observability, and CI/CD.

## Project structure

```
mini-order-system/
  package.json
  README.md
  schema.sql
  orders.db            (created automatically on first run)
  src/
    server.js          Express app: middleware, static files, route wiring
    db.js              SQLite connection + schema loading
    orders.js          Order routes + validation
  public/
    index.html         Frontend page
    styles.css         Frontend styling
    app.js             Frontend logic (fetch calls)
```

## Requirements

- Node.js 18 or newer (uses built-in `crypto.randomUUID()`)

## Install dependencies

```bash
npm install
```

## Initialize the database

The database is initialized automatically when the server starts. You can also initialize it manually:

```bash
npm run init-db
```

This creates `orders.db` and applies `schema.sql` (the `orders` table and its indexes).

## Start the server

```bash
npm start
```

Or with auto-reload during development:

```bash
npm run dev
```

Then open <http://localhost:3000> for the frontend.

## API

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

### Health check

```bash
curl http://localhost:3000/healthz
# {"status":"ok"}
```

## Order statuses

```
PENDING
  -> PAYMENT_COMPLETED | PAYMENT_FAILED
       -> INVENTORY_RESERVED | INVENTORY_FAILED
            -> CONFIRMED | FAILED
```

Status transitions are currently done manually through the API/frontend. In a later version, Kafka consumers (payment service, inventory service) will drive these transitions automatically.

## How it works (brief)

- `src/server.js` starts Express, initializes the database, serves the frontend from `public/`, and mounts the `/orders` router plus `/healthz`.
- `src/db.js` opens the SQLite file (`orders.db`) and executes `schema.sql` so the table always exists.
- `src/orders.js` defines the order routes and validates input (required fields, `quantity > 0`, valid status values).
- `public/app.js` calls the API with `fetch` and renders the order list, including the status-update dropdown.

## Extending later (not yet implemented)

- Kafka topics (e.g. `orders.created`) and consumers for payment/inventory steps
- Docker image and Kubernetes manifests
- Prometheus metrics / Grafana dashboards
- Structured logging and tracing
- CI/CD pipeline
