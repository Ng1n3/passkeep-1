import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';
dotenv.config();

const configService = new ConfigService();

// Get the database configuration
const getDatabaseConfig = (): DataSourceOptions => {
  const databaseType = configService.get<string>('DATABASE_TYPE');

  if (!databaseType) {
    throw new Error('DATABASE_TYPE is not defined in environment');
  }

  const baseConfig = {
    synchronize: configService.get<boolean>('DATABASE_SYNCHRONIZE', false),
    logging: configService.get<boolean>('DATABASE_LOGGING', true),
    entities: ['dist/src/modules/**/entities/*.entity{.ts,.js}'],
    migrations: ['dist/db/migrations/*.js'],
    migrationsTableName: 'migrations',
  };

  switch (databaseType) {
    case 'postgres':
      return {
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        host: configService.get<string>('DATABASE_HOST'),
        port: configService.get<number>('DATABASE_PORT', 5432),
        username: configService.get<string>('DATABASE_USERNAME'),
        password: configService.get<string>('DATABASE_PASSWORD'),
        database: configService.get<string>('DATABASE_NAME'),
        ...baseConfig,
      };

    case 'mysql':
      return {
        type: 'mysql',
        url: configService.get<string>('DATABASE_URL'),
        host: configService.get<string>('DATABASE_HOST'),
        port: configService.get<number>('DATABASE_PORT', 3306),
        username: configService.get<string>('DATABASE_USERNAME'),
        password: configService.get<string>('DATABASE_PASSWORD'),
        database: configService.get<string>('DATABASE_NAME'),
        ...baseConfig,
      };

    case 'sqlite':
      return {
        type: 'sqlite',
        database: configService.get<string>('DATABASE_NAME', 'database.sqlite'),
        ...baseConfig,
      };

    default:
      throw new Error(`Unsupported database type: ${databaseType}`);
  }
};

const dataSource = new DataSource(getDatabaseConfig());

export async function initializeDataSource(): Promise<DataSource> {
  if (!dataSource.isInitialized) {
    await dataSource.initialize();
  }
  return dataSource;
}

export default dataSource;
