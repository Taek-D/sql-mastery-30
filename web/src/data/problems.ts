import type { Difficulty } from '../services/gamification';
import problemsData from './problems.json';

export interface SchemaInfo {
  table: string;
  columns: string[];
}

export interface Problem {
  day: number;
  title: string;
  difficulty: Difficulty;
  database: 'ecommerce' | 'subscription' | 'both';
  context: string;
  schema: SchemaInfo[];
  question: string;
  hints: string[];
  answerQuery: string;
  starterCode: string;
  explanation: string;
}

export const problems: Problem[] = problemsData as Problem[];
