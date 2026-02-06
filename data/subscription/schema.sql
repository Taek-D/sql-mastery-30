-- SQL Mastery 30 - Subscription App Database Schema
-- PostgreSQL 14+

-- 사용자 테이블
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    signup_date DATE NOT NULL,
    plan_type VARCHAR(20) NOT NULL CHECK (plan_type IN ('free', 'basic', 'premium'))
);

-- 구독 테이블
CREATE TABLE subscriptions (
    subscription_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    start_date DATE NOT NULL,
    end_date DATE,
    plan_type VARCHAR(20) NOT NULL CHECK (plan_type IN ('free', 'basic', 'premium')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'cancelled', 'expired'))
);

-- 이벤트 테이블 (사용자 활동 로그)
CREATE TABLE events (
    event_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    event_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    event_type VARCHAR(50) NOT NULL
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX idx_users_signup_date ON users(signup_date);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_events_user_id ON events(user_id);
CREATE INDEX idx_events_event_date ON events(event_date);
CREATE INDEX idx_events_event_type ON events(event_type);

-- 주석
COMMENT ON TABLE users IS '사용자 정보 테이블';
COMMENT ON TABLE subscriptions IS '구독 정보 테이블';
COMMENT ON TABLE events IS '사용자 활동 로그 테이블';
