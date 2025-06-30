import * as dotenv from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';

dotenv.config({ path: '.env.test' });

export const testDatabaseConfig: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '5434', 10),
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  synchronize: true,
  logging: false,
  entities: ['src/modules/**/entities/*.entity{.ts,.js}'],
  migrations: ['src/db/migrations/*{.ts,.js}'],
  migrationsTableName: 'migrations',
  dropSchema: true,
};

export const testDataSource = new DataSource(testDatabaseConfig);

export async function initializeTestDataSource(): Promise<DataSource> {
  if (!testDataSource.isInitialized) {
    await testDataSource.initialize();
    await testDataSource.runMigrations();
  }
  return testDataSource;
}
