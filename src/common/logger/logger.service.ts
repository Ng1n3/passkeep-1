// src/common/logger/logger.service.ts
import { Injectable, LoggerService } from '@nestjs/common';
import { Logger } from 'nestjs-pino';

@Injectable()
export class AppLogger implements LoggerService {
  constructor(private readonly logger: Logger) {}

  log(message: string, context?: string) {
    this.logger.log({ context }, message);
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error({ context, stack: trace }, message);
  }

  warn(message: string, context?: string) {
    this.logger.warn({ context }, message);
  }

  debug(message: string, context?: string) {
    this.logger.debug({ context }, message);
  }

  verbose(message: string, context?: string) {
    this.logger.verbose({ context }, message);
  }
}
