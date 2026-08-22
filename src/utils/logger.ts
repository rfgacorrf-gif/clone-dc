import pino from 'pino';
import { config } from '../config.js';

const pinoLogger = pino({
  level: config.logging.level,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
});

export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private maskSecrets(message: string): string {
    return message
      .replace(/DISCORD_TOKEN=\S+/g, 'DISCORD_TOKEN=***')
      .replace(/DROPBOX_APP_SECRET=\S+/g, 'DROPBOX_APP_SECRET=***')
      .replace(/DROPBOX_REFRESH_TOKEN=\S+/g, 'DROPBOX_REFRESH_TOKEN=***')
      .replace(/Bearer\s+\S{20,}/g, 'Bearer ***');
  }

  info(message: string, meta?: Record<string, any>): void {
    pinoLogger.info({ context: this.context, ...meta }, this.maskSecrets(message));
  }

  warn(message: string, meta?: Record<string, any>): void {
    pinoLogger.warn({ context: this.context, ...meta }, this.maskSecrets(message));
  }

  error(message: string, error?: Error | Record<string, any>, meta?: Record<string, any>): void {
    const errorData = error instanceof Error ? { error: error.message, stack: error.stack } : error;
    pinoLogger.error({ context: this.context, ...errorData, ...meta }, this.maskSecrets(message));
  }

  debug(message: string, meta?: Record<string, any>): void {
    pinoLogger.debug({ context: this.context, ...meta }, this.maskSecrets(message));
  }
}

export const createLogger = (context: string): Logger => new Logger(context);
