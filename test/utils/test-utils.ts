import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { testDatabaseConfig } from '../../src/database/test-data-source';
import { User } from '../../src/modules/users/entities/user.entity';

export class TestApp {
  public app: INestApplication;
  public userRepository: Repository<User>;
  public dataSource: DataSource;
  private module: TestingModule;

  async setupTestApp(): Promise<void> {
    // First, create a separate DataSource for testing
    this.dataSource = new DataSource(testDatabaseConfig);

    try {
      await this.dataSource.initialize();
      console.log('Test database connected successfully');
    } catch (error) {
      console.error('Failed to connect to test database:', error);
      throw error;
    }

    // Create the test module with the initialized DataSource
    this.module = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DataSource)
      .useValue(this.dataSource)
      .compile();

    this.app = this.module.createNestApplication();

    this.app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    // Get repositories
    this.userRepository = this.module.get<Repository<User>>(
      getRepositoryToken(User),
    );

    await this.app.init();
  }

  async cleanUpTestApp(): Promise<void> {
    try {
      if (this.app) {
        await this.app.close();
      }

      if (this.dataSource?.isInitialized) {
        await this.dataSource.destroy();
        console.log('Test database connection closed');
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  async clearDatabase(): Promise<void> {
    if (!this.dataSource?.isInitialized) {
      throw new Error('DataSource is not initialized. Cannot clear database');
    }

    const entities = this.dataSource.entityMetadatas;
    const tableNames = entities
      .map((entity) => `"${entity.tableName}"`)
      .join(', ');

    try {
      await this.dataSource.query(
        `TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE`,
      );
      console.log('Database cleared successfully');
    } catch (error: any) {
      console.error('Error clearing database: ', error);
      throw error;
    }
  }

  async createTestUser(userData: Partial<User> = {}): Promise<User> {
    const defaultUser = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'hashedpassword123',
      is_activated: false,
      ...userData,
    };

    const user = this.userRepository.create(defaultUser);
    return await this.userRepository.save(user);
  }

  // Helper method to find user by email
  async findUserByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { email } });
  }

  // Helper method to find user by username
  async findUserByUsername(username: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { username } });
  }
}
