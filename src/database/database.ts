import Database from 'better-sqlite3';
import path from 'path';
import { config } from '../config.js';
import { createLogger } from '../utils/logger.js';
import type { CloneJob, NameCounter, CloneHistory } from '../types/index.js';
import fs from 'fs/promises';
import { existsSync } from 'fs';

const logger = createLogger('Database');

export class DatabaseService {
  private db: Database.Database;
  private dataDir: string;

  constructor() {
    this.dataDir = config.paths.data;
  }

  async initialize(): Promise<void> {
    try {
      // Ensure data directory exists
      await fs.mkdir(this.dataDir, { recursive: true });

      const dbPath = path.join(this.dataDir, 'database.sqlite');
      this.db = new Database(dbPath);

      // Enable foreign keys
      this.db.pragma('foreign_keys = ON');
      this.db.pragma('journal_mode = WAL');

      await this.runMigrations();
      logger.info('Database initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database', error);
      throw error;
    }
  }

  private async runMigrations(): Promise<void> {
    try {
      // Create name_counters table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS name_counters (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          prefix TEXT UNIQUE NOT NULL,
          next_number INTEGER NOT NULL DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create clone_jobs table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS clone_jobs (
          id TEXT PRIMARY KEY,
          source TEXT NOT NULL,
          prefix TEXT NOT NULL,
          number TEXT NOT NULL,
          status TEXT NOT NULL,
          original_package_name TEXT,
          new_package_name TEXT,
          app_name TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          started_at DATETIME,
          completed_at DATETIME,
          error TEXT,
          dropbox_link TEXT
        )
      `);

      // Create clone_history table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS clone_history (
          id TEXT PRIMARY KEY,
          job_id TEXT NOT NULL,
          prefix TEXT NOT NULL,
          number TEXT NOT NULL,
          status TEXT NOT NULL,
          cloned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          dropbox_link TEXT,
          error TEXT,
          FOREIGN KEY (job_id) REFERENCES clone_jobs(id)
        )
      `);

      // Create indexes
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_jobs_status ON clone_jobs(status);
        CREATE INDEX IF NOT EXISTS idx_jobs_prefix ON clone_jobs(prefix);
        CREATE INDEX IF NOT EXISTS idx_history_job_id ON clone_history(job_id);
      `);

      logger.info('Migrations completed successfully');
    } catch (error) {
      logger.error('Migration failed', error);
      throw error;
    }
  }

  // Name Counter Methods
  async getNextNumber(prefix: string): Promise<string> {
    try {
      const stmt = this.db.prepare(`
        SELECT next_number FROM name_counters WHERE prefix = ?
      `);
      const result = stmt.get(prefix) as { next_number: number } | undefined;

      if (result) {
        const nextNum = result.next_number;
        const updateStmt = this.db.prepare(`
          UPDATE name_counters SET next_number = next_number + 1, updated_at = CURRENT_TIMESTAMP WHERE prefix = ?
        `);
        updateStmt.run(prefix);
        return String(nextNum).padStart(2, '0');
      } else {
        const insertStmt = this.db.prepare(`
          INSERT INTO name_counters (prefix, next_number) VALUES (?, 2)
        `);
        insertStmt.run(prefix);
        return '01';
      }
    } catch (error) {
      logger.error('Failed to get next number', error);
      throw error;
    }
  }

  async setPrefix(prefix: string): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        INSERT OR IGNORE INTO name_counters (prefix, next_number) VALUES (?, 1)
      `);
      stmt.run(prefix);
      logger.info(`Prefix set: ${prefix}`);
    } catch (error) {
      logger.error('Failed to set prefix', error);
      throw error;
    }
  }

  async getPrefixInfo(prefix: string): Promise<NameCounter | null> {
    try {
      const stmt = this.db.prepare(`
        SELECT prefix, next_number, created_at, updated_at FROM name_counters WHERE prefix = ?
      `);
      const result = stmt.get(prefix) as any;
      if (result) {
        return {
          prefix: result.prefix,
          nextNumber: result.next_number,
          createdAt: new Date(result.created_at),
          updatedAt: new Date(result.updated_at),
        };
      }
      return null;
    } catch (error) {
      logger.error('Failed to get prefix info', error);
      throw error;
    }
  }

  // Clone Job Methods
  async createJob(job: CloneJob): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO clone_jobs (
          id, source, prefix, number, status, original_package_name, 
          new_package_name, app_name, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        job.id,
        job.source,
        job.prefix,
        job.number,
        job.status,
        job.originalPackageName || null,
        job.newPackageName || null,
        job.appName || null,
        new Date().toISOString()
      );
    } catch (error) {
      logger.error('Failed to create job', error);
      throw error;
    }
  }

  async updateJobStatus(
    jobId: string,
    status: CloneJob['status'],
    data?: { error?: string; dropboxLink?: string; startedAt?: Date; completedAt?: Date }
  ): Promise<void> {
    try {
      const updates: string[] = ['status = ?'];
      const values: any[] = [status];

      if (data?.error) {
        updates.push('error = ?');
        values.push(data.error);
      }
      if (data?.dropboxLink) {
        updates.push('dropbox_link = ?');
        values.push(data.dropboxLink);
      }
      if (data?.startedAt) {
        updates.push('started_at = ?');
        values.push(data.startedAt.toISOString());
      }
      if (data?.completedAt) {
        updates.push('completed_at = ?');
        values.push(data.completedAt.toISOString());
      }

      values.push(jobId);

      const stmt = this.db.prepare(`
        UPDATE clone_jobs SET ${updates.join(', ')} WHERE id = ?
      `);
      stmt.run(...values);
    } catch (error) {
      logger.error('Failed to update job status', error);
      throw error;
    }
  }

  async getJob(jobId: string): Promise<CloneJob | null> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM clone_jobs WHERE id = ?
      `);
      const result = stmt.get(jobId) as any;
      if (result) {
        return this.mapRowToJob(result);
      }
      return null;
    } catch (error) {
      logger.error('Failed to get job', error);
      throw error;
    }
  }

  async getJobsByStatus(status: string): Promise<CloneJob[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM clone_jobs WHERE status = ? ORDER BY created_at DESC
      `);
      const results = stmt.all(status) as any[];
      return results.map(row => this.mapRowToJob(row));
    } catch (error) {
      logger.error('Failed to get jobs by status', error);
      throw error;
    }
  }

  private mapRowToJob(row: any): CloneJob {
    return {
      id: row.id,
      source: row.source,
      prefix: row.prefix,
      number: row.number,
      status: row.status,
      createdAt: new Date(row.created_at),
      startedAt: row.started_at ? new Date(row.started_at) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      error: row.error,
      dropboxLink: row.dropbox_link,
      originalPackageName: row.original_package_name,
      newPackageName: row.new_package_name,
      appName: row.app_name,
    };
  }

  // History Methods
  async addHistory(history: CloneHistory): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO clone_history (
          id, job_id, prefix, number, status, cloned_at, dropbox_link, error
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        history.id,
        history.jobId,
        history.prefix,
        history.number,
        history.status,
        history.clonedAt.toISOString(),
        history.dropboxLink || null,
        history.error || null
      );
    } catch (error) {
      logger.error('Failed to add history', error);
      throw error;
    }
  }

  async getRecentHistory(limit: number = 20): Promise<CloneHistory[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM clone_history ORDER BY cloned_at DESC LIMIT ?
      `);
      const results = stmt.all(limit) as any[];
      return results.map(row => ({
        id: row.id,
        jobId: row.job_id,
        prefix: row.prefix,
        number: row.number,
        status: row.status,
        clonedAt: new Date(row.cloned_at),
        dropboxLink: row.dropbox_link,
        error: row.error,
      }));
    } catch (error) {
      logger.error('Failed to get recent history', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      logger.info('Database connection closed');
    }
  }
}

export const databaseService = new DatabaseService();
