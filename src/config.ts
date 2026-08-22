import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Config } from './types/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function validateEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function validateInteger(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Invalid integer for ${key}: ${value}`);
  }
  return parsed;
}

export const config: Config = {
  discord: {
    token: validateEnv('DISCORD_TOKEN'),
    clientId: validateEnv('DISCORD_CLIENT_ID'),
    guildId: validateEnv('DISCORD_GUILD_ID'),
  },
  owner: {
    id: validateEnv('OWNER_ID'),
  },
  dropbox: {
    appKey: validateEnv('DROPBOX_APP_KEY'),
    appSecret: validateEnv('DROPBOX_APP_SECRET'),
    refreshToken: validateEnv('DROPBOX_REFRESH_TOKEN'),
    rootPath: validateEnv('DROPBOX_ROOT_PATH', '/APK-CLONER'),
  },
  clone: {
    maxClones: validateInteger('MAX_CLONES', 20),
    queueConcurrency: validateInteger('QUEUE_CONCURRENCY', 2),
    maxFileSizeMB: validateInteger('MAX_FILE_SIZE_MB', 500),
  },
  paths: {
    temp: process.env.TEMP_DIR || '/app/temp',
    output: process.env.OUTPUT_DIR || '/app/output',
    data: process.env.DATA_DIR || '/app/data',
    logs: process.env.LOG_DIR || '/app/logs',
    icon: process.env.ICON_DIR || '/app/icon',
    image: process.env.IMAGE_DIR || '/app/image',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

export function validateConfig(): void {
  const required = [
    config.discord.token,
    config.discord.clientId,
    config.discord.guildId,
    config.owner.id,
    config.dropbox.appKey,
    config.dropbox.appSecret,
    config.dropbox.refreshToken,
  ];

  for (const value of required) {
    if (!value) {
      throw new Error('Config validation failed');
    }
  }
}
