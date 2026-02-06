-- SQL Mastery 30 - E-commerce Database Schema
-- PostgreSQL 14+

-- 사용자 테이블
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    signup_date DATE NOT NULL,
    region VARCHAR(50),
    user_segment VARCHAR(20) CHECK (user_segment IN ('premium', 'regular', 'inactive'))
);

-- 상품 테이블
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    product_name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0)
);

-- 주문 테이블
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    order_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount >= 0),
    status VARCHAR(20) NOT NULL CHECK (status IN ('completed', 'cancelled', 'pending'))
);

-- 주문 상세 테이블
CREATE TABLE order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(order_id),
    product_id INTEGER NOT NULL REFERENCES products(product_id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    item_price DECIMAL(10, 2) NOT NULL CHECK (item_price >= 0)
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX idx_users_signup_date ON users(signup_date);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_order_date ON orders(order_date);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- 주석
COMMENT ON TABLE users IS '사용자 정보 테이블';
COMMENT ON TABLE products IS '상품 정보 테이블';
COMMENT ON TABLE orders IS '주문 정보 테이블';
COMMENT ON TABLE order_items IS '주문 상세 정보 테이블';
