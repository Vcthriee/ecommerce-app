
-- Create function to automatically update updated_at timestamp
-- This runs whenever a row is modified
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    -- Set updated_at to current time when row changes
    NEW.updated_at = CURRENT_TIMESTAMP;
    -- Return modified row to complete the update
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Attach trigger to users table
-- Automatically updates updated_at on any UPDATE to users
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Attach trigger to products table
CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Attach trigger to orders table
CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON orders 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();