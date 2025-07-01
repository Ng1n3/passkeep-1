// test/integration/users.service.integration.spec.ts
import { BadRequestException, ConflictException } from '@nestjs/common';
import { CreateUserDto } from '../../src/modules/users/dto/create-user.dto';
import { UsersService } from '../../src/modules/users/users.service';
import { TestApp } from '../utils/test-utils';

describe('UsersService Integration Tests', () => {
  let testApp: TestApp;
  let usersService: UsersService;

  beforeAll(async () => {
    testApp = new TestApp();
    await testApp.setupTestApp();
    usersService = testApp.app.get<UsersService>(UsersService);
  });

  afterEach(async () => {
    await testApp.clearDatabase();
  });

  afterAll(async () => {
    await testApp.cleanUpTestApp();
  });

  describe('createUser', () => {
    it('should create a user successfully', async () => {
      const createUserDto: CreateUserDto = {
        email: 'newuser@test.com',
        username: 'newuser',
        password: 'password123',
        password_confirm: 'password123',
      };

      const createdUser = await usersService.createUser(createUserDto);

      expect(createdUser).toBeDefined();
      expect(createdUser.email).toBe(createUserDto.email);
      expect(createdUser.username).toBe(createUserDto.username);
      expect(createdUser.password).not.toBe(createUserDto.password); // Should be hashed
      expect(createdUser.id).toBeDefined();
      expect(createdUser.created_at).toBeDefined();

      // Verify user exists in database
      const savedUser = await testApp.findUserByEmail(createUserDto.email);
      expect(savedUser).toBeDefined();
      expect(savedUser?.username).toBe(createUserDto.username);
    });

    it('should throw ConflictException when username already exists', async () => {
      // Create initial user
      await testApp.createTestUser({
        username: 'existinguser',
        email: 'existing@test.com',
      });

      const createUserDto: CreateUserDto = {
        email: 'different@test.com',
        username: 'existinguser', // Same username
        password: 'password123',
        password_confirm: 'password123',
      };

      await expect(usersService.createUser(createUserDto)).rejects.toThrow(
        ConflictException,
      );

      // Verify no duplicate user was created
      const users = await testApp.userRepository.find();
      expect(users).toHaveLength(1);
    });

    it('should throw ConflictException when email already exists', async () => {
      // Create initial user
      await testApp.createTestUser({
        username: 'existinguser',
        email: 'existing@test.com',
      });

      const createUserDto: CreateUserDto = {
        email: 'existing@test.com', // Same email
        username: 'differentuser',
        password: 'password123',
        password_confirm: 'password123',
      };

      await expect(usersService.createUser(createUserDto)).rejects.toThrow(
        ConflictException,
      );

      // Verify no duplicate user was created
      const users = await testApp.userRepository.find();
      expect(users).toHaveLength(1);
    });

    it('should throw BadRequestException when passwords do not match', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@test.com',
        username: 'testuser',
        password: 'password123',
        password_confirm: 'differentpassword',
      };

      await expect(usersService.createUser(createUserDto)).rejects.toThrow(
        BadRequestException,
      );

      // Verify no user was created
      const users = await testApp.userRepository.find();
      expect(users).toHaveLength(0);
    });

    it('should hash the password before saving', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@test.com',
        username: 'testuser',
        password: 'plainpassword',
        password_confirm: 'plainpassword',
      };

      const createdUser = await usersService.createUser(createUserDto);

      expect(createdUser.password).not.toBe('plainpassword');
      expect(createdUser.password).toMatch(/^\$2[aby]\$\d{1,2}\$/); // bcrypt hash pattern
    });
  });

  describe('validateUniqueConstraints', () => {
    it('should pass validation when username and email are unique', async () => {
      await expect(
        usersService.validateUniqueConstraints('uniqueuser', 'unique@test.com'),
      ).resolves.not.toThrow();
    });

    it('should throw ConflictException when username exists', async () => {
      await testApp.createTestUser({
        username: 'existinguser',
        email: 'existing@test.com',
      });

      await expect(
        usersService.validateUniqueConstraints(
          'existinguser',
          'different@test.com',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when email exists', async () => {
      await testApp.createTestUser({
        username: 'existinguser',
        email: 'existing@test.com',
      });

      await expect(
        usersService.validateUniqueConstraints(
          'differentuser',
          'existing@test.com',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Database persistence', () => {
    it('should persist user data correctly in database', async () => {
      const createUserDto: CreateUserDto = {
        email: 'persist@test.com',
        username: 'persistuser',
        password: 'password123',
        password_confirm: 'password123',
      };

      const createdUser = await usersService.createUser(createUserDto);

      // Query database directly to verify persistence
      const dbUser = await testApp.userRepository
        .createQueryBuilder('user')
        .where('user.id = :id', { id: createdUser.id })
        .getOne();

      expect(dbUser).toBeDefined();
      expect(dbUser?.email).toBe(createUserDto.email);
      expect(dbUser?.username).toBe(createUserDto.username);
      expect(dbUser?.is_activated).toBe(false); // Default value
    });

    it('should handle concurrent user creation attempts', async () => {
      const createUserDto1: CreateUserDto = {
        email: 'concurrent1@test.com',
        username: 'concurrent1',
        password: 'password123',
        password_confirm: 'password123',
      };

      const createUserDto2: CreateUserDto = {
        email: 'concurrent2@test.com',
        username: 'concurrent2',
        password: 'password123',
        password_confirm: 'password123',
      };

      // Create users concurrently
      const [user1, user2] = await Promise.all([
        usersService.createUser(createUserDto1),
        usersService.createUser(createUserDto2),
      ]);

      expect(user1.id).not.toBe(user2.id);
      expect(user1.email).toBe(createUserDto1.email);
      expect(user2.email).toBe(createUserDto2.email);

      // Verify both users exist in database
      const allUsers = await testApp.userRepository.find();
      expect(allUsers).toHaveLength(2);
    });
  });

  describe('Error handling', () => {
    it('should maintain data integrity on validation failures', async () => {
      // Create initial user
      await testApp.createTestUser({
        username: 'existing',
        email: 'existing@test.com',
      });

      const invalidDto: CreateUserDto = {
        email: 'existing@test.com', // Duplicate email
        username: 'newuser',
        password: 'password123',
        password_confirm: 'password123',
      };

      await expect(usersService.createUser(invalidDto)).rejects.toThrow(
        ConflictException,
      );

      // Verify database still contains only original user
      const users = await testApp.userRepository.find();
      expect(users).toHaveLength(1);
      expect(users[0].email).toBe('existing@test.com');
    });
  });
});
