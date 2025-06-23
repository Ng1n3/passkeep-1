import { registerAs } from '@nestjs/config';
import { DataSourceOptions } from 'typeorm';

export interface DatabaseConfig {
  type: 'postgres' | 'mysql' | 'mariadb' | 'sqlite' | 'mssql' | 'aurora-mysql';
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database: string;
  synchronize?: boolean;
  logging?: boolean;
  entities?: string[];
  migrations?: string[];
  migrationsTableName?: string;
  cli?: Record<string, any>;
}

export default registerAs('database', (): DataSourceOptions => {
  const databaseType = process.env.DATABASE_TYPE;

  if (!databaseType) {
    throw new Error('DATABASE_TYPE is not defined');
  }

  // Base configuration that's common to most database types
  const baseConfig = {
    synchronize: process.env.DATABASE_SYNCHRONIZE === 'true',
    logging: process.env.DATABASE_LOGGING === 'true',
    entities: ['dist/src/modules/**/entities/*.entity{.ts,.js}'],
    migrations: ['dist/db/migrations/*.js'],
    migrationsTableName: 'migrations',
  };

  // Handle different database types with proper typing
  switch (databaseType) {
    case 'postgres':
      return {
        type: 'postgres',
        url: process.env.DATABASE_URL,
        host: process.env.DATABASE_HOST,
        port: parseInt(process.env.DATABASE_PORT || '5432', 10),
        username: process.env.DATABASE_USERNAME,
        password: process.env.DATABASE_PASSWORD,
        database: process.env.DATABASE_NAME,
        ...baseConfig,
      };

    case 'mysql':
      return {
        type: 'mysql',
        url: process.env.DATABASE_URL,
        host: process.env.DATABASE_HOST,
        port: parseInt(process.env.DATABASE_PORT || '3306', 10),
        username: process.env.DATABASE_USERNAME,
        password: process.env.DATABASE_PASSWORD,
        database: process.env.DATABASE_NAME,
        ...baseConfig,
      };

    case 'mariadb':
      return {
        type: 'mariadb',
        url: process.env.DATABASE_URL,
        host: process.env.DATABASE_HOST,
        port: parseInt(process.env.DATABASE_PORT || '3306', 10),
        username: process.env.DATABASE_USERNAME,
        password: process.env.DATABASE_PASSWORD,
        database: process.env.DATABASE_NAME,
        ...baseConfig,
      };

    case 'sqlite':
      if (!process.env.DATABASE_NAME) {
        throw new Error('DATABASE_NAME is required for SQLite');
      }
      return {
        type: 'sqlite',
        database: process.env.DATABASE_NAME,
        ...baseConfig,
      };

    case 'mssql':
      return {
        type: 'mssql',
        host: process.env.DATABASE_HOST,
        port: parseInt(process.env.DATABASE_PORT || '1433', 10),
        username: process.env.DATABASE_USERNAME,
        password: process.env.DATABASE_PASSWORD,
        database: process.env.DATABASE_NAME,
        options: {
          encrypt: process.env.DATABASE_ENCRYPT === 'true',
          trustServerCertificate:
            process.env.DATABASE_TRUST_SERVER_CERTIFICATE === 'true',
        },
        ...baseConfig,
      };

    default:
      throw new Error(`Unsupported database type: ${databaseType}`);
  }
});
