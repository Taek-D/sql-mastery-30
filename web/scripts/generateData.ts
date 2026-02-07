/**
 * Generate SQLite-compatible SQL INSERT statements for both ecommerce and subscription databases.
 * Outputs to src/database/ecommerce.sql and src/database/subscription.sql
 */
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Deterministic random
let seed = 42;
function rand(): number {
  seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
  return seed / 0x7fffffff;
}

function randInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

function randomDate(start: string, end: string): string {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const d = new Date(s + rand() * (e - s));
  return d.toISOString().split('T')[0];
}

function randomTimestamp(start: string, end: string): string {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const d = new Date(s + rand() * (e - s));
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

function esc(s: string): string {
  return s.replace(/'/g, "''");
}

// ============================
// E-COMMERCE DATABASE
// ============================
function generateEcommerce(): string {
  const lines: string[] = [];

  lines.push('-- SQL Mastery 30: E-commerce Database (SQLite)');
  lines.push('-- Auto-generated for browser execution');
  lines.push('');

  // Schema
  lines.push('CREATE TABLE IF NOT EXISTS users (');
  lines.push('    user_id INTEGER PRIMARY KEY AUTOINCREMENT,');
  lines.push('    signup_date TEXT NOT NULL,');
  lines.push('    region TEXT,');
  lines.push("    user_segment TEXT CHECK (user_segment IN ('premium', 'regular', 'inactive'))");
  lines.push(');');
  lines.push('');
  lines.push('CREATE TABLE IF NOT EXISTS products (');
  lines.push('    product_id INTEGER PRIMARY KEY AUTOINCREMENT,');
  lines.push('    product_name TEXT NOT NULL,');
  lines.push('    category TEXT NOT NULL,');
  lines.push('    price REAL NOT NULL CHECK (price >= 0)');
  lines.push(');');
  lines.push('');
  lines.push('CREATE TABLE IF NOT EXISTS orders (');
  lines.push('    order_id INTEGER PRIMARY KEY AUTOINCREMENT,');
  lines.push('    user_id INTEGER NOT NULL REFERENCES users(user_id),');
  lines.push('    order_date TEXT NOT NULL,');
  lines.push('    total_amount REAL NOT NULL CHECK (total_amount >= 0),');
  lines.push("    status TEXT NOT NULL CHECK (status IN ('completed', 'cancelled', 'pending'))");
  lines.push(');');
  lines.push('');
  lines.push('CREATE TABLE IF NOT EXISTS order_items (');
  lines.push('    order_item_id INTEGER PRIMARY KEY AUTOINCREMENT,');
  lines.push('    order_id INTEGER NOT NULL REFERENCES orders(order_id),');
  lines.push('    product_id INTEGER NOT NULL REFERENCES products(product_id),');
  lines.push('    quantity INTEGER NOT NULL CHECK (quantity > 0),');
  lines.push('    item_price REAL NOT NULL CHECK (item_price >= 0)');
  lines.push(');');
  lines.push('');

  // Indexes
  lines.push('CREATE INDEX IF NOT EXISTS idx_users_signup_date ON users(signup_date);');
  lines.push('CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);');
  lines.push('CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date);');
  lines.push('CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);');
  lines.push('CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);');
  lines.push('');

  // Users (200)
  const regions = ['서울', '경기', '부산', '대구', '인천', '광주', '대전', '제주'];
  const segments: Array<'premium' | 'regular' | 'inactive'> = ['premium', 'regular', 'inactive'];
  const segmentWeights = [0.2, 0.6, 0.2]; // 20% premium, 60% regular, 20% inactive

  for (let i = 1; i <= 200; i++) {
    const signupDate = randomDate('2024-06-01', '2025-06-30');
    const region = pick(regions);
    const r = rand();
    let segment: string;
    if (r < segmentWeights[0]) segment = segments[0];
    else if (r < segmentWeights[0] + segmentWeights[1]) segment = segments[1];
    else segment = segments[2];

    lines.push(
      `INSERT INTO users (user_id, signup_date, region, user_segment) VALUES (${i}, '${signupDate}', '${region}', '${segment}');`,
    );
  }
  lines.push('');

  // Products (50)
  const categories = ['전자기기', '의류', '식품', '가구', '화장품', '도서', '스포츠', '완구'];
  const productNames: Record<string, string[]> = {
    전자기기: ['무선 이어폰', '스마트워치', '블루투스 스피커', '충전기', '키보드', '마우스', '모니터'],
    의류: ['티셔츠', '청바지', '후드티', '자켓', '원피스', '셔츠', '트레이닝복'],
    식품: ['유기농 샐러드', '수제 그래놀라', '냉동 피자', '단백질 바', '에너지 음료', '견과류 세트'],
    가구: ['사무용 의자', '책상', '서랍장', '침대 프레임', '선반', '소파'],
    화장품: ['선크림', '로션', '클렌저', '마스크팩', '세럼', '립스틱'],
    도서: ['프로그래밍 입문', 'SQL 마스터', '데이터 분석 실무', '통계학 개론', '경영 전략', '자기계발서'],
    스포츠: ['요가 매트', '런닝화', '덤벨 세트', '축구공', '테니스 라켓', '수영 고글'],
    완구: ['레고 세트', '보드게임', '퍼즐', '인형', '블록 세트', 'RC카'],
  };

  let productId = 0;
  const allProducts: Array<{ id: number; category: string; price: number }> = [];

  for (const category of categories) {
    const names = productNames[category];
    const count = Math.min(names.length, Math.ceil(50 / categories.length));
    for (let j = 0; j < count && productId < 50; j++) {
      productId++;
      const price = +(randInt(5000, 200000) / 100).toFixed(2);
      allProducts.push({ id: productId, category, price });
      lines.push(
        `INSERT INTO products (product_id, product_name, category, price) VALUES (${productId}, '${esc(names[j])}', '${category}', ${price});`,
      );
    }
  }
  lines.push('');

  // Orders (1000) and Order Items (2500)
  const statuses = ['completed', 'cancelled', 'pending'];
  const statusWeights = [0.7, 0.15, 0.15];

  const orderLines: string[] = [];
  const itemLines: string[] = [];
  let orderItemId = 0;

  for (let orderId = 1; orderId <= 1000; orderId++) {
    const userId = randInt(1, 200);
    const orderDate = randomTimestamp('2024-07-01', '2025-06-30');
    const r = rand();
    let status: string;
    if (r < statusWeights[0]) status = statuses[0];
    else if (r < statusWeights[0] + statusWeights[1]) status = statuses[1];
    else status = statuses[2];

    // 1-5 items per order
    const numItems = randInt(1, 5);
    let totalAmount = 0;

    for (let j = 0; j < numItems; j++) {
      orderItemId++;
      const product = pick(allProducts);
      const quantity = randInt(1, 3);
      const discount = rand() < 0.3 ? +(product.price * (1 - rand() * 0.2)).toFixed(2) : product.price;
      totalAmount += quantity * discount;

      itemLines.push(
        `INSERT INTO order_items (order_item_id, order_id, product_id, quantity, item_price) VALUES (${orderItemId}, ${orderId}, ${product.id}, ${quantity}, ${discount.toFixed(2)});`,
      );
    }

    totalAmount = +totalAmount.toFixed(2);
    orderLines.push(
      `INSERT INTO orders (order_id, user_id, order_date, total_amount, status) VALUES (${orderId}, ${userId}, '${orderDate}', ${totalAmount}, '${status}');`,
    );
  }

  lines.push(...orderLines);
  lines.push('');
  lines.push(...itemLines);
  lines.push('');

  return lines.join('\n');
}

// ============================
// SUBSCRIPTION DATABASE
// ============================
function generateSubscription(): string {
  const lines: string[] = [];

  lines.push('-- SQL Mastery 30: Subscription Database (SQLite)');
  lines.push('-- Auto-generated for browser execution');
  lines.push('-- Prefixed with sub_ to avoid conflicts with ecommerce tables');
  lines.push('');

  // Schema
  lines.push('CREATE TABLE IF NOT EXISTS sub_users (');
  lines.push('    user_id INTEGER PRIMARY KEY AUTOINCREMENT,');
  lines.push('    signup_date TEXT NOT NULL,');
  lines.push("    plan_type TEXT NOT NULL CHECK (plan_type IN ('free', 'basic', 'premium'))");
  lines.push(');');
  lines.push('');
  lines.push('CREATE TABLE IF NOT EXISTS subscriptions (');
  lines.push('    subscription_id INTEGER PRIMARY KEY AUTOINCREMENT,');
  lines.push('    user_id INTEGER NOT NULL REFERENCES sub_users(user_id),');
  lines.push('    start_date TEXT NOT NULL,');
  lines.push('    end_date TEXT,');
  lines.push("    plan_type TEXT NOT NULL CHECK (plan_type IN ('free', 'basic', 'premium')),");
  lines.push("    status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'expired'))");
  lines.push(');');
  lines.push('');
  lines.push('CREATE TABLE IF NOT EXISTS events (');
  lines.push('    event_id INTEGER PRIMARY KEY AUTOINCREMENT,');
  lines.push('    user_id INTEGER NOT NULL REFERENCES sub_users(user_id),');
  lines.push('    event_date TEXT NOT NULL,');
  lines.push('    event_type TEXT NOT NULL');
  lines.push(');');
  lines.push('');

  // Indexes
  lines.push('CREATE INDEX IF NOT EXISTS idx_sub_users_signup ON sub_users(signup_date);');
  lines.push('CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);');
  lines.push('CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);');
  lines.push('CREATE INDEX IF NOT EXISTS idx_events_user ON events(user_id);');
  lines.push('CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);');
  lines.push('CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);');
  lines.push('');

  // Sub_users (200)
  const plans: Array<'free' | 'basic' | 'premium'> = ['free', 'basic', 'premium'];
  const planWeights = [0.4, 0.35, 0.25];

  for (let i = 1; i <= 200; i++) {
    const signupDate = randomDate('2024-06-01', '2025-06-30');
    const r = rand();
    let plan: string;
    if (r < planWeights[0]) plan = plans[0];
    else if (r < planWeights[0] + planWeights[1]) plan = plans[1];
    else plan = plans[2];

    lines.push(
      `INSERT INTO sub_users (user_id, signup_date, plan_type) VALUES (${i}, '${signupDate}', '${plan}');`,
    );
  }
  lines.push('');

  // Subscriptions (200)
  const subStatuses = ['active', 'cancelled', 'expired'];
  const subStatusWeights = [0.5, 0.25, 0.25];

  for (let i = 1; i <= 200; i++) {
    const userId = randInt(1, 200);
    const startDate = randomDate('2024-06-01', '2025-06-01');
    const r = rand();
    let status: string;
    if (r < subStatusWeights[0]) status = subStatuses[0];
    else if (r < subStatusWeights[0] + subStatusWeights[1]) status = subStatuses[1];
    else status = subStatuses[2];

    let endDate: string | null = null;
    if (status !== 'active') {
      const start = new Date(startDate);
      const months = randInt(1, 6);
      start.setMonth(start.getMonth() + months);
      endDate = start.toISOString().split('T')[0];
    }

    const plan = pick(plans);
    const endDateStr = endDate ? `'${endDate}'` : 'NULL';

    lines.push(
      `INSERT INTO subscriptions (subscription_id, user_id, start_date, end_date, plan_type, status) VALUES (${i}, ${userId}, '${startDate}', ${endDateStr}, '${plan}', '${status}');`,
    );
  }
  lines.push('');

  // Events (5000)
  const eventTypes = ['login', 'page_view', 'purchase', 'subscription_start', 'subscription_cancel', 'feature_use', 'search', 'share', 'feedback'];

  for (let i = 1; i <= 5000; i++) {
    const userId = randInt(1, 200);
    const eventDate = randomTimestamp('2024-07-01', '2025-06-30');
    const eventType = pick(eventTypes);

    lines.push(
      `INSERT INTO events (event_id, user_id, event_date, event_type) VALUES (${i}, ${userId}, '${eventDate}', '${eventType}');`,
    );
  }
  lines.push('');

  return lines.join('\n');
}

// Main
const outDir = join(__dirname, '..', 'src', 'database');
writeFileSync(join(outDir, 'ecommerce.sql'), generateEcommerce(), 'utf-8');
console.log('Generated ecommerce.sql');
writeFileSync(join(outDir, 'subscription.sql'), generateSubscription(), 'utf-8');
console.log('Generated subscription.sql');
console.log('Done!');
