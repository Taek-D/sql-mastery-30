-- Subscription App 샘플 데이터 생성 스크립트
-- PostgreSQL 14+ 호환

-- 1. users 테이블 샘플 데이터 (500명)
INSERT INTO users (signup_date)
SELECT 
    DATE '2024-01-01' + (random() * 365)::int AS signup_date
FROM generate_series(1, 500);

-- 2. subscriptions 테이블 샘플 데이터
INSERT INTO subscriptions (user_id, start_date, end_date, plan_type, status)
SELECT 
    u.user_id,
    u.signup_date AS start_date,
    CASE 
        WHEN random() < 0.7 THEN NULL  -- 70% active (no end_date)
        ELSE u.signup_date + (random() * 180 + 30)::int  -- 30% cancelled/expired
    END AS end_date,
    (ARRAY['free', 'basic', 'premium'])[floor(random() * 3 + 1)] AS plan_type,
    CASE 
        WHEN random() < 0.7 THEN 'active'
        WHEN random() < 0.85 THEN 'cancelled'
        ELSE 'expired'
    END AS status
FROM users u;

-- 3. events 테이블 샘플 데이터 (사용자당 평균 50개 이벤트)
INSERT INTO events (user_id, event_date, event_type)
SELECT 
    user_id,
    DATE '2024-01-01' + (random() * 365)::int + (random() * interval '24 hours') AS event_date,
    (ARRAY['login', 'content_view', 'search', 'share', 'download'])[floor(random() * 5 + 1)] AS event_type
FROM users
CROSS JOIN generate_series(1, floor(random() * 80 + 20)::int);  -- 20~100개/사용자

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_users_signup_date ON users(signup_date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_start_date ON subscriptions(start_date);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date);

-- 샘플 데이터 통계 확인
SELECT 'users' AS table_name, COUNT(*) AS row_count FROM users
UNION ALL
SELECT 'subscriptions', COUNT(*) FROM subscriptions
UNION ALL
SELECT 'events', COUNT(*) FROM events;
