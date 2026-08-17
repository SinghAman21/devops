-- Orders table
-- Each row represents one order that will flow through a series
-- of statuses (PENDING -> PAYMENT_COMPLETED -> INVENTORY_RESERVED -> CONFIRMED).
-- Later, Kafka workers will drive these transitions. For now we
-- update statuses manually via the PATCH endpoint.

CREATE TABLE IF NOT EXISTS orders (
    id              TEXT PRIMARY KEY,
    product_id      TEXT NOT NULL,
    quantity        INTEGER NOT NULL CHECK (quantity > 0),
    customer_email  TEXT NOT NULL,
    status          TEXT NOT NULL,
    failure_reason  TEXT,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);

-- Index to keep GET /orders (ordered by created_at desc) fast
-- as the table grows.
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);
