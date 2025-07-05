import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as joi from 'joi';
import { LoggerModule } from 'nestjs-pino';
import databaseConfig, { DatabaseConfig } from '../config/database.config';
import googleOauthConfig from '../config/google-oauth.config';
import jwtConfig from '../config/jwt.config';
import serverConfig from '../config/server.config';
import userConfig from '../config/user.config';
import { HealthController } from './health/health.controller';
import { AuthModule } from './modules/auth/auth.module';
import { CookieModule } from './modules/cookies/cookie.module';
import { PasswordModule } from './modules/password/password.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  controllers: [HealthController],
  providers: [],
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env'],
      isGlobal: true,
      load: [
        serverConfig,
        databaseConfig,
        userConfig,
        jwtConfig,
        googleOauthConfig,
      ],
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
    UsersModule,
    AuthModule,
    CookieModule,
    PasswordModule,
  ],
})
export class AppModule {}
