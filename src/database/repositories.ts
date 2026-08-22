import sqlite3 from 'sqlite3';
import path from 'path';
import { config } from '../config.js';
import { createLogger } from '../utils/logger.js';
import type { CloneJob, NameCounter, CloneHistory } from '../types/index.js';
import fs from 'fs/promises';

const logger = createLogger('DatabaseRepository');

export interface ICloneJobRepository {
  create(job: CloneJob): Promise<void>;
  update(jobId: string, status: CloneJob['status'], data?: any): Promise<void>;
  getById(jobId: string): Promise<CloneJob | null>;
  getByStatus(status: string): Promise<CloneJob[]>;
  getAll(): Promise<CloneJob[]>;
}

export interface INameCounterRepository {
  getNextNumber(prefix: string): Promise<string>;
  setPrefix(prefix: string): Promise<void>;
  getPrefix(prefix: string): Promise<NameCounter | null>;
}

export interface IHistoryRepository {
  add(history: CloneHistory): Promise<void>;
  getRecent(limit: number): Promise<CloneHistory[]>;
  getByJobId(jobId: string): Promise<CloneHistory | null>;
}
