/// <reference types="vite/client" />

declare module '*.sql?raw' {
  const content: string;
  export default content;
}

declare module 'sql.js' {
  export interface QueryExecResult {
    columns: string[];
    values: unknown[][];
  }

  export interface Database {
    run(sql: string, params?: unknown[]): Database;
    exec(sql: string, params?: unknown[]): QueryExecResult[];
    close(): void;
  }

  export interface SqlJsStatic {
    Database: new (data?: ArrayLike<number>) => Database;
  }

  export interface InitConfig {
    locateFile?: (file: string) => string;
  }

  export default function initSqlJs(config?: InitConfig): Promise<SqlJsStatic>;
}
