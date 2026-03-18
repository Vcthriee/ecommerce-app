
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO categories (name, description) VALUES 
('Electronics', 'Gadgets and electronic devices'),
('Clothing', 'Apparel and fashion items'),
('Home & Garden', 'Home improvement and garden supplies'),
('Books', 'Physical and digital books'),
('Sports', 'Sports equipment and accessories');