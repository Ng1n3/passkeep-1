import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Logger } from 'nestjs-pino';
// import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { initializeDataSource } from './database/data-source';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  const logger = app.get<Logger>(Logger);

  // const dataSource = app.get(DataSource);

  try {
    await initializeDataSource();
    console.log('Data Source has been initialized');
  } catch (error) {
    console.error('Error during Data Source initialization', error);
    process.exit(1);
  }

  app.enableCors();
  app.set('trust proxy');
  app.useLogger(logger);
  app.setGlobalPrefix('api/v1', { exclude: ['health', 'api/docs'] });

  const options = new DocumentBuilder()
    .setTitle('passKeep-1 API')
    .setDescription('API documentation for passKeep-1')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('api/docs', app, document);

  app.use('api/docs-json', (req: Request, res: Response) => {
    res.json(document);
  });

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
