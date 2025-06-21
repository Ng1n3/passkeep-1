import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import serverConfig from 'config/server.config';
import * as joi from 'joi';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  controllers: [AppController],
  providers: [AppService],
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env'],
      isGlobal: true,
      load: [serverConfig],
      validationSchema: joi.object({
        PORT: joi.number().required(),
      }),
    }),
    LoggerModule.forRoot(),
  ],
})
export class AppModule {}
