---
name: schema-reference
description: E-commerce 및 Subscription DB 전체 스키마 참조 (CHECK 제약 포함)
---

# DB 스키마 레퍼런스

## E-commerce Database

### users
```sql
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    signup_date DATE NOT NULL,
    region VARCHAR(50) NOT NULL,
    user_segment VARCHAR(20) NOT NULL
        CHECK (user_segment IN ('premium', 'regular', 'inactive'))
);
```
- **user_segment**: `premium`, `regular`, `inactive` (NOT `active`)

### products
```sql
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    product_name VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL
);
```

### orders
```sql
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    order_date DATE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL
        CHECK (status IN ('completed', 'cancelled', 'pending'))
);
```
- **status**: `completed`, `cancelled`, `pending`

### order_items
```sql
CREATE TABLE order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(order_id),
    product_id INTEGER NOT NULL REFERENCES products(product_id),
    quantity INTEGER NOT NULL,
    item_price DECIMAL(10,2) NOT NULL
);
```

### 관계
```
users (1) ──→ (N) orders ──→ (N) order_items (N) ←── (1) products
```

---

## Subscription Database

### users
```sql
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    signup_date DATE NOT NULL,
    plan_type VARCHAR(20) NOT NULL
        CHECK (plan_type IN ('free', 'basic', 'premium'))
);
```
- **plan_type**: `free`, `basic`, `premium`

### subscriptions
```sql
CREATE TABLE subscriptions (
    subscription_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    start_date DATE NOT NULL,
    end_date DATE,
    plan_type VARCHAR(20) NOT NULL
        CHECK (plan_type IN ('free', 'basic', 'premium')),
    status VARCHAR(20) NOT NULL
        CHECK (status IN ('active', 'cancelled', 'expired'))
);
```
- **status**: `active`, `cancelled`, `expired` (NOT `completed`)
- **plan_type**: `free`, `basic`, `premium`

### events
```sql
CREATE TABLE events (
    event_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    event_date TIMESTAMP NOT NULL,
    event_type VARCHAR(50) NOT NULL
);
```
- **event_type**: CHECK 없음 — 자유 입력 (예: `login`, `purchase`, `page_view`, `signup`)

### 관계
```
users (1) ──→ (N) subscriptions
users (1) ──→ (N) events
```

---

## 샘플 데이터 규모

| DB | 테이블 | 행 수 |
|----|--------|------:|
| E-commerce | users | 200 |
| E-commerce | products | 50 |
| E-commerce | orders | 1,000 |
| E-commerce | order_items | ~2,500 |
| Subscription | users | 200 |
| Subscription | subscriptions | 200 |
| Subscription | events | 5,000 |

## 파일 위치
- E-commerce 스키마: `data/ecommerce/schema.sql`
- E-commerce 샘플: `data/ecommerce/sample_data.sql`
- Subscription 스키마: `data/subscription/schema.sql`
- Subscription 샘플: `data/subscription/sample_data.sql`
- SQLite 변환: `web/src/database/`
