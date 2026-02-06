-- E-commerce 샘플 데이터 생성 스크립트
-- PostgreSQL 14+ 호환

-- 1. users 테이블 샘플 데이터 (1000명)
INSERT INTO users (signup_date, region, user_segment)
SELECT 
    DATE '2024-01-01' + (random() * 365)::int AS signup_date,
    (ARRAY['Seoul', 'Busan', 'Incheon', 'Daegu', 'Gwangju'])[floor(random() * 5 + 1)] AS region,
    (ARRAY['premium', 'regular', 'inactive'])[floor(random() * 3 + 1)] AS user_segment
FROM generate_series(1, 1000);

-- 2. products 테이블 샘플 데이터 (100개 상품)
INSERT INTO products (product_name, category, price, stock_quantity)
SELECT 
    'Product ' || i AS product_name,
    (ARRAY['전자제품', '의류', '식품', '도서', '생활용품'])[floor(random() * 5 + 1)] AS category,
    (random() * 100000 + 10000)::int AS price,
    (random() * 500 + 10)::int AS stock_quantity
FROM generate_series(1, 100) AS i;

-- 3. orders 테이블 샘플 데이터 (5000건)
INSERT INTO orders (user_id, order_date, total_amount, status)
SELECT 
    floor(random() * 1000 + 1)::int AS user_id,
    DATE '2024-01-01' + (random() * 365)::int + (random() * interval '24 hours') AS order_date,
    (random() * 500000 + 10000)::int AS total_amount,
    (ARRAY['completed', 'pending', 'cancelled'])[
        CASE 
            WHEN random() < 0.85 THEN 1  -- 85% completed
            WHEN random() < 0.95 THEN 2  -- 10% pending
            ELSE 3  -- 5% cancelled
        END
    ] AS status
FROM generate_series(1, 5000);

-- 4. order_items 테이블 샘플 데이터 (평균 2-3개 상품/주문)
INSERT INTO order_items (order_id, product_id, quantity, item_price)
SELECT 
    o.order_id,
    floor(random() * 100 + 1)::int AS product_id,
    floor(random() * 5 + 1)::int AS quantity,
    (random() * 100000 + 5000)::int AS item_price
FROM orders o
CROSS JOIN generate_series(1, floor(random() * 3 + 1)::int);

-- 5. inventory 테이블 샘플 데이터 (일별 재고 기록)
INSERT INTO inventory (product_id, stock_quantity, last_updated)
SELECT 
    p.product_id,
    (random() * 500 + 10)::int AS stock_quantity,
    DATE '2025-01-01' + (random() * 31)::int AS last_updated
FROM products p
CROSS JOIN generate_series(1, 5);  -- 각 상품당 5개 레코드

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_users_signup_date ON users(signup_date);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- 샘플 데이터 통계 확인
SELECT 'users' AS table_name, COUNT(*) AS row_count FROM users
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'order_items', COUNT(*) FROM order_items
UNION ALL
SELECT 'inventory', COUNT(*) FROM inventory;
