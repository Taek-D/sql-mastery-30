/**
 * Parse 30 problem markdown files and convert to JSON for the web app.
 * Also converts PostgreSQL-specific SQL syntax to SQLite.
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface SchemaInfo {
  table: string;
  columns: string[];
}

interface Problem {
  day: number;
  title: string;
  difficulty: 'basic' | 'intermediate' | 'advanced';
  database: 'ecommerce' | 'subscription' | 'both';
  context: string;
  schema: SchemaInfo[];
  question: string;
  hints: string[];
  answerQuery: string;
  starterCode: string;
  explanation: string;
}

const ecommerceTables = new Set(['users', 'products', 'orders', 'order_items']);
const subscriptionTables = new Set(['users', 'subscriptions', 'events']);
// Subscription-only tables
const subOnlyTables = new Set(['subscriptions', 'events']);

function parseDifficulty(text: string): Problem['difficulty'] {
  const stars = (text.match(/⭐/g) || []).length;
  if (stars >= 3) return 'advanced';
  if (stars >= 2) return 'intermediate';
  return 'basic';
}

function detectDatabase(schema: SchemaInfo[]): Problem['database'] {
  const tableNames = schema.map((s) => s.table.toLowerCase());
  const hasSubOnly = tableNames.some((t) => subOnlyTables.has(t));
  const hasEcommerceSpecific = tableNames.some((t) => t === 'products' || t === 'order_items' || t === 'orders');

  if (hasSubOnly && hasEcommerceSpecific) return 'both';
  if (hasSubOnly) return 'subscription';
  return 'ecommerce';
}

function parseSchemaSection(text: string): SchemaInfo[] {
  const schemas: SchemaInfo[] = [];
  const lines = text.split('\n');
  for (const line of lines) {
    // Match patterns like: - **users**: user_id, signup_date, ...
    const match = line.match(/[-*]\s*\*?\*?(\w+)\*?\*?\s*:?\s*(.+)/);
    if (match) {
      const table = match[1].toLowerCase();
      const columns = match[2]
        .split(',')
        .map((c) => c.trim())
        .filter((c) => c.length > 0 && !c.startsWith('('));
      if (columns.length > 0) {
        schemas.push({ table, columns });
      }
    }
  }
  return schemas;
}

function extractSection(content: string, header: string): string {
  const headerRegex = new RegExp(`###\\s+${header}[^\\n]*\\n`, 'i');
  const match = content.match(headerRegex);
  if (!match) return '';

  const start = (match.index ?? 0) + match[0].length;
  const nextHeader = content.indexOf('\n### ', start);
  const end = nextHeader === -1 ? content.length : nextHeader;

  return content.substring(start, end).trim();
}

function extractSqlBlock(text: string): string {
  const match = text.match(/```sql\n([\s\S]*?)```/);
  return match ? match[1].trim() : '';
}

function convertPgToSqlite(sql: string): string {
  let result = sql;

  // DATE_TRUNC('month', col) → strftime('%Y-%m-01', col)
  result = result.replace(
    /DATE_TRUNC\s*\(\s*'month'\s*,\s*([^)]+)\)/gi,
    "strftime('%Y-%m-01', $1)",
  );

  // DATE_TRUNC('week', col) → date(col, 'weekday 0', '-6 days')
  result = result.replace(
    /DATE_TRUNC\s*\(\s*'week'\s*,\s*([^)]+)\)/gi,
    "date($1, 'weekday 0', '-6 days')",
  );

  // DATE_TRUNC('year', col) → strftime('%Y-01-01', col)
  result = result.replace(
    /DATE_TRUNC\s*\(\s*'year'\s*,\s*([^)]+)\)/gi,
    "strftime('%Y-01-01', $1)",
  );

  // DATE_TRUNC('day', col) → date(col)
  result = result.replace(
    /DATE_TRUNC\s*\(\s*'day'\s*,\s*([^)]+)\)/gi,
    "date($1)",
  );

  // EXTRACT(MONTH FROM col) → CAST(strftime('%m', col) AS INTEGER)
  result = result.replace(
    /EXTRACT\s*\(\s*MONTH\s+FROM\s+([^)]+)\)/gi,
    "CAST(strftime('%m', $1) AS INTEGER)",
  );

  // EXTRACT(YEAR FROM col) → CAST(strftime('%Y', col) AS INTEGER)
  result = result.replace(
    /EXTRACT\s*\(\s*YEAR\s+FROM\s+([^)]+)\)/gi,
    "CAST(strftime('%Y', $1) AS INTEGER)",
  );

  // EXTRACT(DOW FROM col) → CAST(strftime('%w', col) AS INTEGER)
  result = result.replace(
    /EXTRACT\s*\(\s*DOW\s+FROM\s+([^)]+)\)/gi,
    "CAST(strftime('%w', $1) AS INTEGER)",
  );

  // EXTRACT(DAY FROM col) → CAST(strftime('%d', col) AS INTEGER)
  result = result.replace(
    /EXTRACT\s*\(\s*DAY\s+FROM\s+([^)]+)\)/gi,
    "CAST(strftime('%d', $1) AS INTEGER)",
  );

  // col + INTERVAL 'N days' → date(col, '+N days')
  result = result.replace(
    /(\w+(?:\.\w+)?)\s*\+\s*INTERVAL\s+'(\d+)\s+days?'/gi,
    "date($1, '+$2 days')",
  );

  // col - INTERVAL 'N days' → date(col, '-N days')
  result = result.replace(
    /(\w+(?:\.\w+)?)\s*-\s*INTERVAL\s+'(\d+)\s+days?'/gi,
    "date($1, '-$2 days')",
  );

  // col + INTERVAL 'N months' → date(col, '+N months')
  result = result.replace(
    /(\w+(?:\.\w+)?)\s*\+\s*INTERVAL\s+'(\d+)\s+months?'/gi,
    "date($1, '+$2 months')",
  );

  // col - INTERVAL 'N months' → date(col, '-N months')
  result = result.replace(
    /(\w+(?:\.\w+)?)\s*-\s*INTERVAL\s+'(\d+)\s+months?'/gi,
    "date($1, '-$2 months')",
  );

  // AGE(a, b) → (julianday(a) - julianday(b))
  result = result.replace(
    /AGE\s*\(([^,]+),\s*([^)]+)\)/gi,
    '(julianday($1) - julianday($2))',
  );

  // TO_CHAR(col, 'YYYY-MM') → strftime('%Y-%m', col)
  result = result.replace(
    /TO_CHAR\s*\(([^,]+),\s*'YYYY-MM'\s*\)/gi,
    "strftime('%Y-%m', $1)",
  );

  // TO_CHAR(col, 'YYYY') → strftime('%Y', col)
  result = result.replace(
    /TO_CHAR\s*\(([^,]+),\s*'YYYY'\s*\)/gi,
    "strftime('%Y', $1)",
  );

  // CURRENT_DATE → date('now')
  result = result.replace(/\bCURRENT_DATE\b/g, "date('now')");

  // col::date → date(col)
  result = result.replace(/(\w+(?:\.\w+)?)::date/gi, 'date($1)');

  // col::text → CAST(col AS TEXT)
  result = result.replace(/(\w+(?:\.\w+)?)::text/gi, 'CAST($1 AS TEXT)');

  // col::integer → CAST(col AS INTEGER)
  result = result.replace(/(\w+(?:\.\w+)?)::integer/gi, 'CAST($1 AS INTEGER)');

  // col::numeric → CAST(col AS REAL)
  result = result.replace(/(\w+(?:\.\w+)?)::numeric/gi, 'CAST($1 AS REAL)');

  // BOOL → INTEGER (for FILTER clauses or CASE WHEN patterns)
  // FILTER (WHERE ...) → not directly supported, leave as is

  // generate_series → not supported, mark problematic
  // We won't convert this - problems using it will be marked PostgreSQL-only

  return result;
}

function parseHints(text: string): string[] {
  const hints: string[] = [];
  // Extract content between <details> tags
  const detailsMatch = text.match(/<details>[\s\S]*?<\/details>/);
  if (detailsMatch) {
    const content = detailsMatch[0]
      .replace(/<\/?details>/g, '')
      .replace(/<\/?summary>[^<]*<\/summary>/g, '')
      .replace(/<summary>[^<]*<\/summary>/g, '')
      .trim();
    const lines = content.split('\n');
    for (const line of lines) {
      const cleaned = line.replace(/^[-*]\s*/, '').replace(/`/g, '').trim();
      if (cleaned.length > 0) {
        hints.push(cleaned);
      }
    }
  }
  return hints;
}

function generateStarterCode(problem: { question: string; schema: SchemaInfo[] }): string {
  const tables = problem.schema.map((s) => s.table);
  if (tables.length === 0) return '-- 여기에 SQL 쿼리를 작성하세요\nSELECT ';

  const mainTable = tables[0];
  return `-- 여기에 SQL 쿼리를 작성하세요\nSELECT \n    \nFROM ${mainTable}\n`;
}

function parseProblem(filePath: string, dayNum: number): Problem {
  const content = readFileSync(filePath, 'utf-8').replace(/\r\n/g, '\n');

  // Title
  const titleMatch = content.match(/##\s*Day\s*\d+\s*:\s*(.+)/);
  const title = titleMatch ? titleMatch[1].trim() : `Day ${dayNum}`;

  // Difficulty
  const diffSection = extractSection(content, '난이도');
  const difficulty = parseDifficulty(diffSection);

  // Context
  const context = extractSection(content, '비즈니스 맥락')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l)
    .join(' ');

  // Schema
  const schemaText = extractSection(content, '테이블 스키마');
  const schema = parseSchemaSection(schemaText);

  // Database
  const database = detectDatabase(schema);

  // Question
  const question = extractSection(content, '질문')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('```'))
    .join('\n');

  // Hints
  const hintSection = extractSection(content, '힌트');
  const hints = parseHints(hintSection);

  // Answer query
  const answerSection = extractSection(content, '정답 쿼리');
  const rawAnswer = extractSqlBlock(answerSection);
  const answerQuery = convertPgToSqlite(rawAnswer);

  // Explanation
  const explanationRaw = extractSection(content, '해설');
  const explanation = explanationRaw
    .split('\n')
    .filter((l) => !l.startsWith('```') && !l.match(/^[-*]\s*$/))
    .map((l) => l.replace(/\*\*/g, '').trim())
    .filter((l) => l)
    .slice(0, 5)
    .join(' ');

  const starterCode = generateStarterCode({ question, schema });

  return {
    day: dayNum,
    title,
    difficulty,
    database,
    context,
    schema,
    question,
    hints,
    answerQuery,
    starterCode,
    explanation,
  };
}

// Main
const problemsDir = join(__dirname, '..', '..', 'problems');
const files = readdirSync(problemsDir)
  .filter((f) => f.match(/^day\d+\.md$/))
  .sort((a, b) => {
    const numA = parseInt(a.match(/\d+/)![0]);
    const numB = parseInt(b.match(/\d+/)![0]);
    return numA - numB;
  });

const problems: Problem[] = [];
for (const file of files) {
  const dayNum = parseInt(file.match(/\d+/)![0]);
  const filePath = join(problemsDir, file);
  try {
    const problem = parseProblem(filePath, dayNum);
    problems.push(problem);
    console.log(`✓ Day ${dayNum}: ${problem.title} (${problem.difficulty}, ${problem.database})`);
  } catch (err) {
    console.error(`✗ Day ${dayNum}: ${err}`);
  }
}

const outPath = join(__dirname, '..', 'src', 'data', 'problems.json');
writeFileSync(outPath, JSON.stringify(problems, null, 2), 'utf-8');
console.log(`\nGenerated ${problems.length} problems → ${outPath}`);
