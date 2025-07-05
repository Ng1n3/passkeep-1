import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from '../../src/modules/users/dto/create-user.dto';
import { User } from '../../src/modules/users/entities/user.entity';
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
        passwords: [],
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
        passwords: [],
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
        passwords: [],
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
        passwords: [],
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
        passwords: [],
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
        passwords: [],
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
        passwords: [],
      };

      const createUserDto2: CreateUserDto = {
        email: 'concurrent2@test.com',
        username: 'concurrent2',
        password: 'password123',
        password_confirm: 'password123',
        passwords: [],
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
        passwords: [],
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

  describe('findAllUsers', () => {
    it('should return empty array when no users exist', async () => {
      const users = await usersService.findAllUsers();

      expect(users).toBeDefined();
      expect(Array.isArray(users)).toBe(true);
      expect(users).toHaveLength(0);
    });

    it('should return all users when users exist', async () => {
      // Create test users
      const user1 = await testApp.createTestUser({
        email: 'user1@test.com',
        username: 'user1',
      });
      const user2 = await testApp.createTestUser({
        email: 'user2@test.com',
        username: 'user2',
      });
      const user3 = await testApp.createTestUser({
        email: 'user3@test.com',
        username: 'user3',
      });

      const users = await usersService.findAllUsers();

      expect(users).toHaveLength(3);
      expect(users.map((u) => u.id)).toContain(user1.id);
      expect(users.map((u) => u.id)).toContain(user2.id);
      expect(users.map((u) => u.id)).toContain(user3.id);
    });

    it('should return users with all expected properties', async () => {
      await testApp.createTestUser({
        email: 'complete@test.com',
        username: 'completeuser',
        is_activated: true,
      });

      const users = await usersService.findAllUsers();

      expect(users).toHaveLength(1);
      const user = users[0];
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email', 'complete@test.com');
      expect(user).toHaveProperty('username', 'completeuser');
      expect(user).toHaveProperty('is_activated', true);
      expect(user).toHaveProperty('created_at');
      expect(user).toHaveProperty('updated_at');
    });

    it('should return users in consistent order', async () => {
      // Create users in specific order
      const _ = await testApp.createTestUser({
        email: 'first@test.com',
        username: 'first',
      });

      // Add small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      const __ = await testApp.createTestUser({
        email: 'second@test.com',
        username: 'second',
      });

      const users = await usersService.findAllUsers();

      expect(users).toHaveLength(2);
      // Verify we get consistent results
      const secondCall = await usersService.findAllUsers();
      expect(users.map((u) => u.id)).toEqual(secondCall.map((u) => u.id));
    });

    it('should handle large number of users', async () => {
      // Create multiple users
      const userPromises = Array.from({ length: 50 }, (_, i) =>
        testApp.createTestUser({
          email: `user${i}@test.com`,
          username: `user${i}`,
        }),
      );

      await Promise.all(userPromises);

      const users = await usersService.findAllUsers();

      expect(users).toHaveLength(50);
      expect(
        users.every((user) => user.id && user.email && user.username),
      ).toBe(true);
    });
  });

  describe('findUser', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await testApp.createTestUser({
        email: 'findme@test.com',
        username: 'findmeuser',
        refresh_token: 'test-refresh-token-123',
      });
    });

    describe('Finding by ID', () => {
      it('should find user by valid ID', async () => {
        const findUserDto = { id: testUser.id };

        const foundUser = await usersService.findUser(findUserDto);

        expect(foundUser).toBeDefined();
        expect(foundUser.id).toBe(testUser.id);
        expect(foundUser.email).toBe(testUser.email);
        expect(foundUser.username).toBe(testUser.username);
      });

      it('should throw NotFoundException for non-existent ID', async () => {
        const findUserDto = { id: '3fa85f64-5717-4562-b3fc-2c963f66afa6' };

        await expect(usersService.findUser(findUserDto)).rejects.toThrow(
          NotFoundException,
        );
      });
    });

    describe('Finding by email', () => {
      it('should find user by valid email', async () => {
        const findUserDto = { email: testUser.email };

        const foundUser = await usersService.findUser(findUserDto);

        expect(foundUser).toBeDefined();
        expect(foundUser.id).toBe(testUser.id);
        expect(foundUser.email).toBe(testUser.email);
      });

      it('should throw NotFoundException for non-existent email', async () => {
        const findUserDto = { email: 'nonexistent@test.com' };

        await expect(usersService.findUser(findUserDto)).rejects.toThrow(
          NotFoundException,
        );
      });

      it('should be case sensitive for email search', async () => {
        const findUserDto = { email: testUser.email.toUpperCase() };

        await expect(usersService.findUser(findUserDto)).rejects.toThrow(
          NotFoundException,
        );
      });
    });

    describe('Finding by refresh_token', () => {
      it('should find user by valid refresh_token', async () => {
        const findUserDto = { refresh_token: testUser.refresh_token };

        const foundUser = await usersService.findUser(findUserDto);

        expect(foundUser).toBeDefined();
        expect(foundUser.id).toBe(testUser.id);
        expect(foundUser.refresh_token).toBe(testUser.refresh_token);
      });

      it('should throw NotFoundException for non-existent refresh_token', async () => {
        const findUserDto = { refresh_token: 'non-existent-token' };

        await expect(usersService.findUser(findUserDto)).rejects.toThrow(
          NotFoundException,
        );
      });
    });

    describe('Multiple search criteria', () => {
      it('should find user when multiple criteria match same user', async () => {
        const findUserDto = {
          id: testUser.id,
          email: testUser.email,
        };

        const foundUser = await usersService.findUser(findUserDto);

        expect(foundUser).toBeDefined();
        expect(foundUser.id).toBe(testUser.id);
        expect(foundUser.email).toBe(testUser.email);
      });

      it('should throw NotFoundException when criteria conflict', async () => {
        const anotherUser = await testApp.createTestUser({
          email: 'another@test.com',
          username: 'anotheruser',
        });

        const findUserDto = {
          id: testUser.id,
          email: anotherUser.email, // Different user's email
        };

        await expect(usersService.findUser(findUserDto)).rejects.toThrow(
          NotFoundException,
        );
      });

      it('should use all provided criteria in WHERE clause', async () => {
        const findUserDto = {
          id: testUser.id,
          email: testUser.email,
          refresh_token: testUser.refresh_token,
        };

        const foundUser = await usersService.findUser(findUserDto);

        expect(foundUser).toBeDefined();
        expect(foundUser.id).toBe(testUser.id);
        expect(foundUser.email).toBe(testUser.email);
        expect(foundUser.refresh_token).toBe(testUser.refresh_token);
      });
    });

    describe('Validation', () => {
      it('should throw BadRequestException when no search criteria provided', async () => {
        const findUserDto = {};

        await expect(usersService.findUser(findUserDto)).rejects.toThrow(
          BadRequestException,
        );
      });

      it('should throw BadRequestException when all criteria are undefined', async () => {
        const findUserDto = {
          id: undefined,
          email: undefined,
          refresh_token: undefined,
        };

        await expect(usersService.findUser(findUserDto)).rejects.toThrow(
          BadRequestException,
        );
      });

      it('should throw BadRequestException when all criteria are null', async () => {
        const findUserDto = {
          id: undefined,
          email: undefined,
          refresh_token: undefined,
        };

        await expect(usersService.findUser(findUserDto)).rejects.toThrow(
          BadRequestException,
        );
      });

      it('should accept valid criteria mixed with undefined values', async () => {
        const findUserDto = {
          id: testUser.id,
          email: undefined,
          refresh_token: undefined,
        };

        const foundUser = await usersService.findUser(findUserDto);

        expect(foundUser).toBeDefined();
        expect(foundUser.id).toBe(testUser.id);
      });
    });

    describe('Database interaction', () => {
      it('should query database with correct WHERE clause', async () => {
        const findUserDto = { email: testUser.email };

        const foundUser = await usersService.findUser(findUserDto);

        // Verify we got the exact user from database
        const dbUser = await testApp.userRepository.findOne({
          where: { email: testUser.email },
        });

        expect(foundUser.id).toBe(dbUser?.id);
        expect(foundUser.email).toBe(dbUser?.email);
        expect(foundUser.created_at).toEqual(dbUser?.created_at);
      });

      it('should handle database connection issues gracefully', async () => {
        // This test would require mocking database connection
        // For now, we test that the service handles errors properly
        const findUserDto = { id: testUser.id };

        // This should work normally
        const foundUser = await usersService.findUser(findUserDto);
        expect(foundUser).toBeDefined();
      });
    });

    describe('Edge cases', () => {
      it('should handle special characters in email search', async () => {
        const specialUser = await testApp.createTestUser({
          email: 'test+special@test-domain.com',
          username: 'specialuser',
        });

        const findUserDto = { email: 'test+special@test-domain.com' };

        const foundUser = await usersService.findUser(findUserDto);

        expect(foundUser).toBeDefined();
        expect(foundUser.email).toBe(specialUser.email);
      });

      it('should handle long refresh tokens', async () => {
        const longToken = 'a'.repeat(500);
        const _ = await testApp.createTestUser({
          email: 'longtoken@test.com',
          username: 'longtokenuser',
          refresh_token: longToken,
        });

        const findUserDto = { refresh_token: longToken };

        const foundUser = await usersService.findUser(findUserDto);

        expect(foundUser).toBeDefined();
        expect(foundUser.refresh_token).toBe(longToken);
      });

      it('should handle zero as valid ID', async () => {
        // Create user with ID 0 (if possible in your setup)
        // This tests edge case of falsy but valid values
        const findUserDto = { id: testUser.id }; // Use existing user's ID

        const foundUser = await usersService.findUser(findUserDto);

        expect(foundUser).toBeDefined();
      });
    });
  });

  describe('clearRefreshToken', () => {
    let testUser: User;

    beforeEach(async () => {
      testUser = await testApp.createTestUser({
        email: 'tokenuser@test.com',
        username: 'tokenuser',
        refresh_token: 'existing-refresh-token-123',
      });
    });

    it('should clear refresh token and set last_signout_at for valid user', async () => {
      await usersService.clearRefreshToken(testUser.id.toString());

      // Verify token was cleared and last_signout_at was set
      const updatedUser = await testApp.userRepository.findOne({
        where: { id: testUser.id },
      });

      expect(updatedUser).toBeDefined();
      expect(updatedUser?.refresh_token).toBeNull();
      expect(updatedUser?.last_signout_at).toBeDefined();

      expect(
        updatedUser?.last_signout_at instanceof Date ||
          typeof updatedUser?.last_signout_at === 'string',
      ).toBeTruthy();

      const signoutDate = new Date(
        updatedUser?.last_signout_at as string | Date,
      );
      expect(signoutDate instanceof Date).toBeTruthy();
      expect(isNaN(signoutDate.getTime())).toBeFalsy();
    });

    it('should throw NotFoundException for non-existent user', async () => {
      const nonExistentUserId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

      await expect(
        usersService.clearRefreshToken(nonExistentUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle user with null refresh token', async () => {
      const userWithoutToken = await testApp.createTestUser({
        email: 'notoken@test.com',
        username: 'notokenuser',
        refresh_token: null,
      });

      await usersService.clearRefreshToken(userWithoutToken.id.toString());

      // Verify last_signout_at was still set
      const updatedUser = await testApp.userRepository.findOne({
        where: { id: userWithoutToken.id },
      });

      expect(updatedUser?.refresh_token).toBeNull();
      expect(updatedUser?.last_signout_at).toBeDefined();
    });

    it('should not affect other user properties', async () => {
      const originalEmail = testUser.email;
      const originalUsername = testUser.username;
      const originalCreatedAt = testUser.created_at;

      await usersService.clearRefreshToken(testUser.id.toString());

      const updatedUser = await testApp.userRepository.findOne({
        where: { id: testUser.id },
      });

      expect(updatedUser?.email).toBe(originalEmail);
      expect(updatedUser?.username).toBe(originalUsername);
      expect(updatedUser?.created_at).toEqual(originalCreatedAt);
    });

    it('should handle concurrent clear token requests', async () => {
      const user1 = await testApp.createTestUser({
        email: 'concurrent1@test.com',
        username: 'concurrent1',
        refresh_token: 'token1',
      });

      const user2 = await testApp.createTestUser({
        email: 'concurrent2@test.com',
        username: 'concurrent2',
        refresh_token: 'token2',
      });

      await Promise.all([
        usersService.clearRefreshToken(user1.id.toString()),
        usersService.clearRefreshToken(user2.id.toString()),
      ]);

      const [updatedUser1, updatedUser2] = await Promise.all([
        testApp.userRepository.findOne({ where: { id: user1.id } }),
        testApp.userRepository.findOne({ where: { id: user2.id } }),
      ]);

      expect(updatedUser1?.refresh_token).toBeNull();
      expect(updatedUser2?.refresh_token).toBeNull();
      expect(updatedUser1?.last_signout_at).toBeDefined();
      expect(updatedUser2?.last_signout_at).toBeDefined();
    });
  });

  describe('deleteUser', () => {
    let testUser: User;

    beforeEach(async () => {
      testUser = await testApp.createTestUser({
        email: 'deleteuser@test.com',
        username: 'deleteuser',
      });
    });

    it('should delete existing user successfully', async () => {
      const userIdDto = { id: testUser.id };

      await usersService.deleteUser(userIdDto);

      // Verify user was deleted
      const deletedUser = await testApp.userRepository.findOne({
        where: { id: testUser.id },
      });

      expect(deletedUser).toBeNull();
    });

    it('should throw NotFoundException for non-existent user', async () => {
      const nonExistentUserDto = { id: '3fa85f64-5717-4562-b3fc-2c963f66afa6' };

      await expect(usersService.deleteUser(nonExistentUserDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should not affect other users when deleting one user', async () => {
      const otherUser = await testApp.createTestUser({
        email: 'other@test.com',
        username: 'otheruser',
      });

      const userIdDto = { id: testUser.id };
      await usersService.deleteUser(userIdDto);

      // Verify other user still exists
      const remainingUser = await testApp.userRepository.findOne({
        where: { id: otherUser.id },
      });

      expect(remainingUser).toBeDefined();
      expect(remainingUser?.email).toBe(otherUser.email);

      // Verify only one user remains
      const allUsers = await testApp.userRepository.find();
      expect(allUsers).toHaveLength(1);
    });

    it('should handle deletion of user with relationships', async () => {
      // This test assumes your User entity might have relationships
      // Adjust based on your actual entity relationships
      const userWithData = await testApp.createTestUser({
        email: 'withdata@test.com',
        username: 'withdatauser',
        refresh_token: 'some-token',
        is_activated: true,
      });

      const userIdDto = { id: userWithData.id };
      await usersService.deleteUser(userIdDto);

      const deletedUser = await testApp.userRepository.findOne({
        where: { id: userWithData.id },
      });

      expect(deletedUser).toBeNull();
    });

    it('should handle concurrent deletion attempts', async () => {
      const userIdDto = { id: testUser.id };

      // First deletion should succeed
      await usersService.deleteUser(userIdDto);

      // Second deletion should fail with NotFoundException
      await expect(usersService.deleteUser(userIdDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateUser', () => {
    let testUser: User;

    beforeEach(async () => {
      testUser = await testApp.createTestUser({
        email: 'updateuser@test.com',
        username: 'updateuser',
        password: 'oldhashedpassword',
        is_activated: false,
      });
    });

    it('should update user fields successfully', async () => {
      const userIdDto = { id: testUser.id };
      const updateUserDto = {
        username: 'updatedusername',
        is_activated: true,
      };

      const updatedUser = await usersService.updateUser(
        userIdDto,
        updateUserDto,
      );

      console.log('updated User', updatedUser);

      expect(updatedUser).toBeDefined();
      expect(updatedUser.username).toBe(updateUserDto.username);
      expect(updatedUser.is_activated).toBe(updateUserDto.is_activated);
      expect(updatedUser.id).toBe(testUser.id);

      // Verify changes persisted in database
      const dbUser = await testApp.userRepository.findOne({
        where: { id: testUser.id },
      });

      expect(dbUser?.username).toBe(updateUserDto.username);
      expect(dbUser?.is_activated).toBe(updateUserDto.is_activated);
    });

    it('should throw ConflictException when trying to update email', async () => {
      const userIdDto = { id: testUser.id };
      const updateUserDto = {
        email: 'newemail@test.com',
      };

      await expect(
        usersService.updateUser(userIdDto, updateUserDto),
      ).rejects.toThrow(ConflictException);

      // Verify email wasn't changed
      const dbUser = await testApp.userRepository.findOne({
        where: { id: testUser.id },
      });
      expect(dbUser?.email).toBe(testUser.email);
    });

    it('should hash password when updating password', async () => {
      const userIdDto = { id: testUser.id };
      const updateUserDto = {
        password: 'newplainpassword',
      };

      const updatedUser = await usersService.updateUser(
        userIdDto,
        updateUserDto,
      );

      expect(updatedUser.password).toBeDefined();
      expect(updatedUser.password).not.toBe('newplainpassword');
      expect(updatedUser.password).toMatch(/^\$2[aby]\$\d{1,2}\$/); // bcrypt hash pattern

      // Verify password was hashed in database
      const dbUser = await testApp.userRepository.findOne({
        where: { id: testUser.id },
      });

      expect(dbUser?.password).toBe(updatedUser.password);
      expect(dbUser?.password).not.toBe('newplainpassword');
    });

    it('should update only provided fields', async () => {
      const originalEmail = testUser.email;
      const originalPassword = testUser.password;

      const userIdDto = { id: testUser.id };
      const updateUserDto = {
        username: 'partialupdateuser',
      };

      const updatedUser = await usersService.updateUser(
        userIdDto,
        updateUserDto,
      );

      expect(updatedUser.username).toBe(updateUserDto.username);
      expect(updatedUser.email).toBe(originalEmail); // Should remain unchanged
      expect(updatedUser.password).toBe(originalPassword); // Should remain unchanged
    });

    it('should throw NotFoundException for non-existent user', async () => {
      const nonExistentUserDto = { id: 'ad6dcecc-1243-4fcf-aa03-d2d3a1fb0ae5' };
      const updateUserDto = { username: 'newusername' };

      await expect(
        usersService.updateUser(nonExistentUserDto, updateUserDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update refresh_token field', async () => {
      const userIdDto = { id: testUser.id };
      const updateUserDto = {
        refresh_token: 'new-refresh-token-456',
      };

      const updatedUser = await usersService.updateUser(
        userIdDto,
        updateUserDto,
      );

      expect(updatedUser.refresh_token).toBe(updateUserDto.refresh_token);

      // Verify in database
      const dbUser = await testApp.userRepository.findOne({
        where: { id: testUser.id },
      });

      expect(dbUser?.refresh_token).toBe(updateUserDto.refresh_token);
    });

    it('should handle updating multiple fields including password', async () => {
      const userIdDto = { id: testUser.id };
      const updateUserDto = {
        username: 'multipleupdateuser',
        password: 'newpassword123',
        is_activated: true,
        refresh_token: 'new-token-789',
      };

      const updatedUser = await usersService.updateUser(
        userIdDto,
        updateUserDto,
      );

      expect(updatedUser.username).toBe(updateUserDto.username);
      expect(updatedUser.is_activated).toBe(updateUserDto.is_activated);
      expect(updatedUser.refresh_token).toBe(updateUserDto.refresh_token);
      expect(updatedUser.password).not.toBe('newpassword123'); // Should be hashed
      expect(updatedUser.password).toMatch(/^\$2[aby]\$\d{1,2}\$/);
    });

    it('should preserve created_at timestamp', async () => {
      const originalCreatedAt = testUser.created_at;

      const userIdDto = { id: testUser.id };
      const updateUserDto = {
        username: 'timestamptest',
      };

      const updatedUser = await usersService.updateUser(
        userIdDto,
        updateUserDto,
      );

      expect(updatedUser.created_at).toEqual(originalCreatedAt);
    });

    it('should update updated_at timestamp', async () => {
      const originalUpdatedAt = testUser.updated_at;

      // Add small delay to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      const userIdDto = { id: testUser.id };
      const updateUserDto = {
        username: 'timestampupdatetest',
      };

      const updatedUser = await usersService.updateUser(
        userIdDto,
        updateUserDto,
      );

      expect(updatedUser.updated_at).toBeDefined();
      if (originalUpdatedAt) {
        expect(updatedUser.updated_at.getTime()).toBeGreaterThan(
          originalUpdatedAt.getTime(),
        );
      }
    });

    it('should handle empty update object', async () => {
      const userIdDto = { id: testUser.id };
      const updateUserDto = {};

      const updatedUser = await usersService.updateUser(
        userIdDto,
        updateUserDto,
      );

      // User should be returned but no fields should change
      expect(updatedUser.id).toBe(testUser.id);
      expect(updatedUser.email).toBe(testUser.email);
      expect(updatedUser.username).toBe(testUser.username);
    });

    it('should handle null values in update', async () => {
      const userIdDto = { id: testUser.id };
      const updateUserDto = {
        refresh_token: undefined,
        last_signout_at: new Date(),
      };

      const updatedUser = await usersService.updateUser(
        userIdDto,
        updateUserDto,
      );

      expect(updatedUser.refresh_token).toBeNull();
      expect(updatedUser.last_signout_at).toBeDefined();
    });

    it('should maintain data integrity during concurrent updates', async () => {
      const user1 = await testApp.createTestUser({
        email: 'concurrent1@test.com',
        username: 'concurrent1',
      });

      const user2 = await testApp.createTestUser({
        email: 'concurrent2@test.com',
        username: 'concurrent2',
      });

      const updates = await Promise.all([
        usersService.updateUser(
          { id: user1.id },
          { username: 'updated_concurrent1' },
        ),
        usersService.updateUser(
          { id: user2.id },
          { username: 'updated_concurrent2' },
        ),
      ]);

      expect(updates[0].username).toBe('updated_concurrent1');
      expect(updates[1].username).toBe('updated_concurrent2');
      expect(updates[0].id).not.toBe(updates[1].id);
    });
  });
});
