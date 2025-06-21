import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  const logger = app.get<Logger>(Logger);

  app.enableCors();
  app.set('trust proxy');
  app.useLogger(logger);
  app.setGlobalPrefix('api/v1', { exclude: ['health'] });

  const port =
    app.get<ConfigService>(ConfigService).get<number>('server.port') || 3000;
  await app.listen(port);

  logger.log({
    message: 'Server started ',
    port,
    url: `http://localhost:${port}/api/v1`,
  });
}

bootstrap().catch((err) => {
  console.error('Error during bootstrap', err);
  process.exit(1);
});
