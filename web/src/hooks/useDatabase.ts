import { useState, useCallback, useRef, useEffect } from 'react';
import type { Database, QueryExecResult } from 'sql.js';
import { initDatabase, resetDatabase } from '../database/initDatabase';

interface UseDatabaseReturn {
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
  executeQuery: (sql: string) => QueryExecResult[];
  resetDb: () => Promise<void>;
}

export function useDatabase(): UseDatabaseReturn {
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dbRef = useRef<Database | null>(null);

  useEffect(() => {
    let mounted = true;
    initDatabase()
      .then((database) => {
        if (mounted) {
          dbRef.current = database;
          setIsReady(true);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(String(err));
          setIsLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const executeQuery = useCallback(
    (sql: string): QueryExecResult[] => {
      if (!dbRef.current) {
        throw new Error('데이터베이스가 초기화되지 않았습니다');
      }
      return dbRef.current.exec(sql);
    },
    [],
  );

  const resetDb = useCallback(async () => {
    setIsLoading(true);
    resetDatabase();
    try {
      const database = await initDatabase();
      dbRef.current = database;
      setIsReady(true);
    } catch (err) {
      setError(String(err));
    }
    setIsLoading(false);
  }, []);

  return { isReady, isLoading, error, executeQuery, resetDb };
}
