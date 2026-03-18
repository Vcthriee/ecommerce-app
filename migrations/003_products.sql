
-- Create products table for e-commerce inventory
CREATE TABLE IF NOT EXISTS products (
    -- Auto-incrementing unique ID for each product
    id SERIAL PRIMARY KEY,
    
    -- Product name, max 255 characters, cannot be empty
    name VARCHAR(255) NOT NULL,
    
    -- Detailed product description, unlimited text
    description TEXT,
    
    -- Product price with 2 decimal places (e.g., 99.99)
    -- CHECK ensures price cannot be negative
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    
    -- How many items in stock, defaults to 0
    -- CHECK ensures stock cannot be negative
    stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
    
    -- Links to category table, if category deleted set this to NULL
    -- ON DELETE SET NULL keeps product even if category removed
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    
    -- URL to product image (e.g., S3 bucket URL)
    image_url VARCHAR(500),
    
    -- Is product visible to customers? Default yes
    is_active BOOLEAN DEFAULT true,
    
    -- When product was added to database
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- When product details were last modified
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index: Fast lookup of products by category (browse Electronics, Clothing, etc.)
CREATE INDEX idx_products_category ON products(category_id);

-- Index: Fast filtering of active/inactive products (admin dashboard)
CREATE INDEX idx_products_active ON products(is_active);

-- Index: Fast sorting by price (low to high, high to low)
CREATE INDEX idx_products_price ON products(price);