-- Orders table
-- Each row represents one order that will flow through a series
-- of statuses (PENDING -> PAYMENT_COMPLETED -> INVENTORY_RESERVED -> CONFIRMED).
-- Later, Kafka workers will drive these transitions. For now we
-- update statuses manually via the PATCH endpoint.

CREATE TABLE IF NOT EXISTS orders (
    id              VARCHAR(36) PRIMARY KEY,
    product_id      VARCHAR(255) NOT NULL,
    quantity        INTEGER NOT NULL CHECK (quantity > 0),
    customer_email  VARCHAR(255) NOT NULL,
    status          VARCHAR(50) NOT NULL,
    failure_reason  TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index to keep GET /orders (ordered by created_at desc) fast
-- as the table grows.
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);
