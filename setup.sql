-- ==========================================
-- SQL Mastery 30 - 전체 환경 설정 스크립트
-- ==========================================
-- PostgreSQL 14+ 버전 권장
-- BigQuery, SQLite 사용 시 일부 문법 수정 필요

-- 1. E-commerce 스키마 생성
\i data/ecommerce/schema.sql

-- 2. Subscription 스키마 생성
\i data/subscription/schema.sql

-- 3. E-commerce 샘플 데이터 삽입
\i data/ecommerce/sample_data.sql

-- 4. Subscription 샘플 데이터 삽입
\i data/subscription/sample_data.sql

-- 완료 메시지
\echo '=========================================='
\echo 'SQL Mastery 30 환경 설정 완료!'
\echo '=========================================='
\echo '사용 가능한 테이블:'
\echo '  - users (E-commerce, Subscription 공통)'
\echo '  - products, orders, order_items, inventory'
\echo '  - subscriptions, events'
\echo ''
\echo '이제 problems/ 폴더의 문제를 풀어보세요!'
\echo ''
