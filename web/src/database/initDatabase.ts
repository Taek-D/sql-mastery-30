import type { Database, SqlJsStatic } from 'sql.js';
import ecommerceSql from './ecommerce.sql?raw';
import subscriptionSql from './subscription.sql?raw';

let db: Database | null = null;

function loadSqlJs(): Promise<(config?: { locateFile?: (file: string) => string }) => Promise<SqlJsStatic>> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).initSqlJs) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      resolve((window as any).initSqlJs);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/sql-wasm.min.js';
    script.onload = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const initFn = (window as any).initSqlJs;
      if (initFn) {
        resolve(initFn);
      } else {
        reject(new Error('sql.js loaded but initSqlJs not found'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load sql.js from CDN'));
    document.head.appendChild(script);
  });
}

export async function initDatabase(): Promise<Database> {
  if (db) return db;

  const initSqlJs = await loadSqlJs();

  const SQL = await initSqlJs({
    locateFile: () =>
      `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/sql-wasm.wasm`,
  });

  db = new SQL.Database();

  // Create ecommerce tables and load data
  db.run(ecommerceSql);

  // Subscription uses different table names to avoid conflicts
  db.run(subscriptionSql);

  return db;
}

export function getDatabase(): Database | null {
  return db;
}

export function resetDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
