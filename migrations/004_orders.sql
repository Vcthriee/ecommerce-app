
-- Create orders table to store customer purchases
CREATE TABLE IF NOT EXISTS orders (
    -- Auto-incrementing unique ID for each order
    id SERIAL PRIMARY KEY,
    
    -- Links to user who placed the order
    -- ON DELETE RESTRICT prevents deleting users with order history
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    
    -- Order status tracking through fulfillment process
    -- CHECK limits to valid status values only
    status VARCHAR(20) DEFAULT 'pending' 
        CHECK (status IN ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled')),
    
    -- Total order amount in decimal (e.g., 299.99)
    -- Calculated from sum of order_items prices
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
    
    -- Shipping address stored as JSONB for flexibility
    -- Contains: street, city, state, zip, country, phone
    shipping_address JSONB NOT NULL,
    
    -- When order was created
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- When order status was last updated
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index: Fast lookup of all orders by specific customer
CREATE INDEX idx_orders_user ON orders(user_id);

-- Index: Fast filtering by order status (find all pending orders)
CREATE INDEX idx_orders_status ON orders(status);

-- Index: Fast sorting by date (recent orders first)
CREATE INDEX idx_orders_created ON orders(created_at DESC);