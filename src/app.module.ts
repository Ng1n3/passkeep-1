import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as joi from 'joi';
import { LoggerModule } from 'nestjs-pino';
import databaseConfig, { DatabaseConfig } from '../config/database.config';
import serverConfig from '../config/server.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  controllers: [AppController],
  providers: [AppService],
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env'],
      isGlobal: true,
      load: [serverConfig, databaseConfig],
      validationSchema: joi.object({
        NODE_ENV: joi
          .string()
          .valid('development', 'production', 'test')
          .default('development'),
        PORT: joi.number().required(),
        DATABASE_TYPE: joi
          .string()
          .valid(
            'postgres',
            'mysql',
            'mariadb',
            'sqlite',
            'mssql',
            'aurora-mysql',
          )
          .required(),
        DATABASE_HOST: joi.string().when('DATABASE_TYPE', {
          is: joi.string().valid('postgres', 'mysql', 'mariadb', 'mssql'),
          then: joi.required(),
          otherwise: joi.optional(),
        }),
        DATABASE_PORT: joi.number().when('DATABASE_TYPE', {
          is: joi.string().valid('postgres', 'mysql', 'mariadb', 'mssql'),
          then: joi.required(),
          otherwise: joi.optional(),
        }),
        DATABASE_USERNAME: joi.string().when('DATABASE_TYPE', {
          is: joi.string().valid('postgres', 'mysql', 'mariadb', 'mssql'),
          then: joi.required(),
          otherwise: joi.optional(),
        }),
        DATABASE_PASSWORD: joi.string().when('DATABASE_TYPE', {
          is: joi.string().valid('postgres', 'mysql', 'mariadb', 'mssql'),
          then: joi.required(),
          otherwise: joi.optional(),
        }),
        DATABASE_NAME: joi.string().required(),
      }),
    }),
    LoggerModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => {
        const dbConfig = configService.get<DatabaseConfig>('database');
        if (!dbConfig) {
          throw new Error('Database config not found');
        }
        return {
          type: dbConfig.type,
          host: dbConfig.host,
          port: dbConfig.port,
          username: dbConfig.username,
          password: dbConfig.password,
          database: dbConfig.database,
          synchronize: dbConfig.synchronize,
          logging: dbConfig.logging,
          entities: [__dirname + '/../**/*.entity{.ts,.js}'],
          migrations: [__dirname + '/../migrations/**/*{.ts,.js}'],
          migrationsTableName: 'migrations',
        };
      },
    }),
  ],
})
export class AppModule {}
