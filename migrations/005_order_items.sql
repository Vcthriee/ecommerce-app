
-- Create order_items table for individual items in each order
-- Separate table allows multiple products per order
CREATE TABLE IF NOT EXISTS order_items (
    -- Auto-incrementing unique ID for each line item
    id SERIAL PRIMARY KEY,
    
    -- Links to parent order
    -- ON DELETE CASCADE removes items if order is deleted
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    
    -- Links to product that was purchased
    -- ON DELETE RESTRICT prevents deleting products referenced in orders
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    
    -- How many units purchased
    -- CHECK ensures at least 1 item
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    
    -- Price at time of purchase (product price may change later)
    -- Stored here for historical accuracy
    price_at_time DECIMAL(10,2) NOT NULL CHECK (price_at_time >= 0)
);

-- Index: Fast lookup of all items in a specific order
CREATE INDEX idx_order_items_order ON order_items(order_id);

-- Index: Fast lookup of which orders contain specific product
CREATE INDEX idx_order_items_product ON order_items(product_id);