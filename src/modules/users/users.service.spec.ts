/* eslint-disable @typescript-eslint/unbound-method */
import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Logger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import * as SysMessages from '../../shared/constants/systemMessages';
import { PasswordConfig } from '../../utils/user.utils';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let userService: UsersService;
  let userRepository: Repository<User>;
  let passwordConfig: PasswordConfig;
  let logger: Logger;

  beforeEach(async () => {
    const mockUserRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      remove: jest.fn(),
      create: jest.fn().mockImplementation((dto: CreateUserDto) => ({
        ...dto,
        is_activated: false,
        refresh_token: null,
        last_signout_at: null,
      })),
      save: jest.fn().mockImplementation((user) =>
        Promise.resolve({
          id: 1,
          ...user,
          created_at: new Date(),
          updated_at: new Date(),
        }),
      ),
      update: jest.fn(), // Add this line to mock the update method
    };

    const mockPasswordConfig = {
      hashPassword: jest.fn().mockResolvedValue('hashedPassword'),
    };

    const mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: PasswordConfig,
          useValue: mockPasswordConfig,
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    userService = module.get<UsersService>(UsersService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    passwordConfig = module.get<PasswordConfig>(PasswordConfig);
    logger = module.get<Logger>(Logger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('UserService - createUser', () => {
    const createUserDto: CreateUserDto = {
      email: 'test@test.com',
      username: 'test',
      password: 'Master_Pa5$word',
      password_confirm: 'Master_Pa5$word',
    };

    it('should create and return a user successfully', async () => {
      // Mock the service methods

      jest
        .spyOn(userService, 'validateUniqueConstraints')
        .mockImplementation(() => Promise.resolve());

      jest.spyOn(userService, 'confirmPassword').mockImplementation(() => true);

      const result = await userService.createUser(createUserDto);

      expect(userService.validateUniqueConstraints).toHaveBeenCalledWith(
        'test',
        'test@test.com',
      );

      expect(userService.confirmPassword).toHaveBeenCalledWith(
        'Master_Pa5$word',
        'Master_Pa5$word',
      );

      expect(passwordConfig.hashPassword).toHaveBeenCalledWith(
        'Master_Pa5$word',
      );

      expect(userRepository.create).toHaveBeenCalledWith({
        username: createUserDto.username,
        email: createUserDto.email,
        password: 'hashedPassword',
      });

      expect(userRepository.save).toHaveBeenCalled();
      expect(result).toEqual({
        id: 1,
        username: 'test',
        email: 'test@test.com',
        password: 'hashedPassword',
        is_activated: false,
        refresh_token: null,
        last_signout_at: null,
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
      });
    });

    it('should throw BadRequestException if passwords do not match', async () => {
      jest
        .spyOn(userService, 'validateUniqueConstraints')
        .mockImplementation(() => Promise.resolve());

      jest
        .spyOn(userService, 'confirmPassword')
        .mockImplementation(() => false);

      await expect(userService.createUser(createUserDto)).rejects.toThrow(
        new BadRequestException(SysMessages.PASSWORD_UNMATCHED),
      );
    });

    it('should rethrow ConflictException from validateUniqueConstraints', async () => {
      jest
        .spyOn(userService, 'validateUniqueConstraints')
        .mockRejectedValue(
          new ConflictException(SysMessages.USER_ALREADY_EXISTS),
        );

      await expect(userService.createUser(createUserDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw InternalServerErrorException on unexpected error', async () => {
      jest
        .spyOn(userService, 'validateUniqueConstraints')
        .mockImplementation(() => Promise.resolve());

      jest.spyOn(userService, 'confirmPassword').mockImplementation(() => true);
      jest
        .spyOn(userRepository, 'save')
        .mockRejectedValue(
          new InternalServerErrorException(SysMessages.CREATE_USER_ERROR),
        );

      await expect(userService.createUser(createUserDto)).rejects.toThrow(
        new InternalServerErrorException(SysMessages.CREATE_USER_ERROR),
      );
    });

    it('should log a message when user is created succcessfully', async () => {
      jest
        .spyOn(userService, 'validateUniqueConstraints')
        .mockImplementation(() => Promise.resolve());

      jest.spyOn(userService, 'confirmPassword').mockImplementation(() => true);

      await userService.createUser(createUserDto);

      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining(SysMessages.CREATE_USER_SUCCESS),
      );
    });
  });

  describe('UserService - findAllUser', () => {
    it('shold return all users successfully and log success', async () => {
      const mockUsers: User[] = [
        {
          id: '1',
          username: 'test',
          email: 'test@test.com',
          password: 'hashedPassword',
          is_activated: false,
          refresh_token: null,
          last_signout_at: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: '2',
          username: 'test2',
          email: 'test2@test.com',
          password: 'hashedPassword',
          is_activated: false,
          refresh_token: null,
          last_signout_at: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      jest.spyOn(userRepository, 'find').mockResolvedValue(mockUsers);

      const result = await userService.findAllUsers();

      expect(userRepository.find).toHaveBeenCalled();
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining(SysMessages.FETCH_USERS_SUCCESS),
      );
      expect(result).toEqual(mockUsers);
    });

    it('should throw Internal server error log and also log if find fails', async () => {
      const mockError = new Error('DB failure');

      jest.spyOn(userRepository, 'find').mockRejectedValue(mockError);

      await expect(userService.findAllUsers()).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(userService.findAllUsers()).rejects.toThrow(
        SysMessages.FETCH_USER_ERROR,
      );

      expect(logger.error).toHaveBeenCalledWith({
        message: SysMessages.FETCH_USER_ERROR,
        error: mockError.message,
        stack: mockError.stack,
        name: mockError.name,
        code: null,
        email: null,
      });
    });
  });

  describe('UserSersive - findUserById', () => {
    const mockUser: User = {
      id: '1',
      username: 'test',
      email: 'test@test.com',
      password: 'hashedPassword',
      is_activated: false,
      refresh_token: null,
      last_signout_at: null,
      created_at: expect.any(Date),
      updated_at: expect.any(Date),
    };
    it('should retun user and log success when user is found', async () => {
      (userRepository.findOne as jest.Mock).mockResolvedValue(mockUser);

      const result = await userService.findUserById({ id: '1' });

      expect(result).toBe(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(logger.log).toHaveBeenCalledWith(SysMessages.FETCH_USERS_SUCCESS);
    });

    it('should throw NotFoundException and log error if user is not found', async () => {
      (userRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(userService.findUserById({ id: '1' })).rejects.toThrow(
        new NotFoundException(SysMessages.USER_NOT_FOUND),
      );

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
      });

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: SysMessages.USER_NOT_FOUND,
          name: 'NotFoundException',
          email: null,
          code: null,
          stack: expect.stringContaining('NotFoundException'),
          error: 'User not found',
        }),
      );
    });

    it('should throw InternalServerErrorException and log if repository throws an unexpected error', async () => {
      const dbError = new Error('DB failure') as any;
      dbError.code = '500';

      (userRepository.findOne as jest.Mock).mockRejectedValue(dbError);

      await expect(userService.findUserById({ id: '123' })).rejects.toThrow(
        new InternalServerErrorException(SysMessages.FETCH_USER_ERROR),
      );

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: SysMessages.FETCH_USER_ERROR,
          error: 'DB failure',
          stack: dbError.stack,
          name: dbError.name,
          code: '500',
          email: null,
        }),
      );
    });
  });

  describe('UserService - findUserByEmail', () => {
    const mockUser: User = {
      id: '1',
      username: 'test',
      email: 'test@test.com',
      password: 'hashedPassword',
      is_activated: false,
      refresh_token: null,
      last_signout_at: null,
      created_at: expect.any(Date),
      updated_at: expect.any(Date),
    };
    it('should retun user and log success when user is found', async () => {
      (userRepository.findOne as jest.Mock).mockResolvedValue(mockUser);

      const result = await userService.findUserByEmail({
        email: 'test@test.com',
      });

      expect(result).toBe(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@test.com' },
      });
      expect(logger.log).toHaveBeenCalledWith(SysMessages.FETCH_USERS_SUCCESS);
      expect(userRepository.findOne).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException and log error if user is not found', async () => {
      (userRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        userService.findUserByEmail({ email: 'test@test.com' }),
      ).rejects.toThrow(new NotFoundException(SysMessages.USER_NOT_FOUND));

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@test.com' },
      });

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: SysMessages.USER_NOT_FOUND,
          name: 'NotFoundException',
          email: null,
          code: null,
          stack: expect.stringContaining('NotFoundException'),
          error: 'User not found',
        }),
      );
    });

    it('should throw InternalServerErrorException and log if repository throws an unexpected error', async () => {
      const dbError = new Error('DB failure') as any;
      dbError.code = '500';

      (userRepository.findOne as jest.Mock).mockRejectedValue(dbError);

      await expect(
        userService.findUserByEmail({ email: '123' }),
      ).rejects.toThrow(
        new InternalServerErrorException(SysMessages.FETCH_USER_ERROR),
      );

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: SysMessages.FETCH_USER_ERROR,
          error: 'DB failure',
          stack: dbError.stack,
          name: dbError.name,
          code: '500',
          email: null,
        }),
      );
    });

    it('should throw NotFoundException and log error user is not found if empty email is given', async () => {
      (userRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(userService.findUserByEmail({ email: ' ' })).rejects.toThrow(
        new BadRequestException(SysMessages.USER_NOT_FOUND),
      );

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: ' ' },
      });

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: SysMessages.USER_NOT_FOUND,
          name: 'NotFoundException',
          email: null,
          code: null,
          stack: expect.stringContaining('NotFoundException'),
          error: 'User not found',
        }),
      );
    });
  });

  describe('UserService - findUser', () => {
    const mockUser: User = {
      id: '1',
      username: 'test',
      email: 'test@test.com',
      password: 'hashedPassword',
      is_activated: false,
      refresh_token:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwiaWF0IjoxNjUwMjU0NjAwLCJleHAiOjE2NTI4NDY2MDB9.4j5D3vV7hRt5JkL8bY1Xz9qN2WQwYdT1oP3aKb6c7m8',
      last_signout_at: null,
      created_at: expect.any(Date),
      updated_at: expect.any(Date),
    };
    it('Should return user when found by id', async () => {
      (userRepository.findOne as jest.Mock).mockResolvedValue(mockUser);

      const result = await userService.findUser({ id: '1' });

      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(logger.log).toHaveBeenCalledWith(SysMessages.FETCH_USERS_SUCCESS);
    });

    it('Should return user when found by email', async () => {
      (userRepository.findOne as jest.Mock).mockResolvedValue(mockUser);

      const result = await userService.findUser({ email: 'test@test.com' });

      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@test.com' },
      });
      expect(logger.log).toHaveBeenCalledWith(SysMessages.FETCH_USERS_SUCCESS);
    });

    it('Should return user when found by email', async () => {
      (userRepository.findOne as jest.Mock).mockResolvedValue(mockUser);

      const result = await userService.findUser({
        refresh_token:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwiaWF0IjoxNjUwMjU0NjAwLCJleHAiOjE2NTI4NDY2MDB9.4j5D3vV7hRt5JkL8bY1Xz9qN2WQwYdT1oP3aKb6c7m8',
      });

      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: {
          refresh_token:
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwiaWF0IjoxNjUwMjU0NjAwLCJleHAiOjE2NTI4NDY2MDB9.4j5D3vV7hRt5JkL8bY1Xz9qN2WQwYdT1oP3aKb6c7m8',
        },
      });
      expect(logger.log).toHaveBeenCalledWith(SysMessages.FETCH_USERS_SUCCESS);
    });

    it('Should throw BadRequestException if no search criteria provided', async () => {
      await expect(userService.findUser({})).rejects.toThrow(
        BadRequestException,
      );

      expect(userRepository.findOne).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: SysMessages.INVALID_SEARCH_CREDENTIALS,
          searchCriteria: {},
        }),
      );
    });

    it('Should throw NotFoundException if user not found', async () => {
      (userRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(userService.findUser({ id: '999' })).rejects.toThrow(
        NotFoundException,
      );

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: '999' },
      });
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: SysMessages.USER_NOT_FOUND,
        }),
      );
    });

    it('Should throw InternalServerErrorException if repository throws error', async () => {
      (userRepository.findOne as jest.Mock).mockRejectedValue(
        new Error('DB connection error'),
      );

      await expect(userService.findUser({ id: '1' })).rejects.toThrow(
        InternalServerErrorException,
      );

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: SysMessages.FETCH_USER_ERROR,
          error: 'DB connection error',
        }),
      );
    });
  });

  describe('UserService - clearRefreshToken', () => {
    const userId = '1';
    const mockUser: User = {
      id: userId,
      username: 'test',
      email: 'test@test.com',
      password: 'hashedPassword',
      is_activated: true,
      refresh_token: 'some-refresh-token',
      last_signout_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should clear refresh token successfully', async () => {
      (userRepository.findOne as jest.Mock).mockResolvedValue(mockUser);
      (userRepository.update as jest.Mock).mockResolvedValue({});

      await userService.clearRefreshToken(userId);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(userRepository.update).toHaveBeenCalledWith(userId, {
        refresh_token: null,
        last_signout_at: expect.any(Date),
      });
      expect(logger.log).toHaveBeenCalledWith(
        SysMessages.TOKEN_CLEAR_SUCCESSFUL,
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      (userRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(userService.clearRefreshToken(userId)).rejects.toThrow(
        NotFoundException,
      );

      expect(logger.error).toHaveBeenCalledWith(SysMessages.USER_NOT_FOUND);
      expect(userRepository.update).not.toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException on unexpected error', async () => {
      (userRepository.findOne as jest.Mock).mockRejectedValue(
        new Error('Database down'),
      );

      await expect(userService.clearRefreshToken(userId)).rejects.toThrow(
        InternalServerErrorException,
      );

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: SysMessages.CLEAR_REFRESH_TOKEN_ERROR,
          error: 'Database down',
        }),
      );
    });

    it('should rethrow HttpException (e.g. NotFoundException)', async () => {
      const customError = new NotFoundException(SysMessages.USER_NOT_FOUND);
      (userRepository.findOne as jest.Mock).mockRejectedValue(customError);

      await expect(userService.clearRefreshToken(userId)).rejects.toThrow(
        NotFoundException,
      );

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: SysMessages.CLEAR_REFRESH_TOKEN_ERROR,
          error: SysMessages.USER_NOT_FOUND,
        }),
      );
    });
  });

  describe('UserService - updatedUserRefreshToken', () => {
    const mockUser = {
      id: '1',
      username: 'testuser',
      email: 'test@test.com',
      password: 'hashedPassword',
      is_activated: true,
      refresh_token: null,
      last_signout_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const updatedUser = {
      ...mockUser,
      refresh_token: 'new-refresh-token',
    };

    it('should successfully update the user refresh token', async () => {
      (userRepository.findOne as jest.Mock).mockResolvedValue(mockUser);
      (userRepository.save as jest.Mock).mockResolvedValue(updatedUser);

      const result = await userService.updatedUserRefreshToken(
        '1',
        'new-refresh-token',
      );

      expect(userRepository.findOne as jest.Mock).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(userRepository.save).toHaveBeenCalledWith({
        ...mockUser,
        refresh_token: 'new-refresh-token',
      });
      expect(logger.log).toHaveBeenCalledWith(
        SysMessages.TOKEN_UPDATE_SUCCESSFUL,
      );
      expect(result).toEqual(updatedUser);
    });

    it('should throw NotFoundException if user is not found', async () => {
      jest
        .spyOn(userService, 'findUserById')
        .mockRejectedValue(new NotFoundException(SysMessages.USER_NOT_FOUND));

      await expect(
        userService.updatedUserRefreshToken('1', 'new-refresh-token'),
      ).rejects.toThrow(NotFoundException);

      expect(userService.findUserById).toHaveBeenCalledWith({ id: '1' });

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: SysMessages.USER_NOT_FOUND,
        }),
      );
    });

    it('should throw InternalServerErrorException on unexpected error', async () => {
      (userRepository.findOne as jest.Mock).mockImplementation(() => {
        throw new Error('Unexpected DB error');
      });

      await expect(
        userService.updatedUserRefreshToken('1', 'new-refresh-token'),
      ).rejects.toThrow(InternalServerErrorException);

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: SysMessages.FETCH_USER_ERROR,
          error: 'Unexpected DB error',
        }),
      );
    });
  });

  describe('UserService - deleteUser', () => {
    const userId = '123';
    const mockUser: User = {
      id: userId,
      username: 'testuser',
      email: 'test@test.com',
      password: 'hashedPassword',
      is_activated: true,
      refresh_token: 'refreshtoken',
      last_signout_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should delete user successfully', async () => {
      jest.spyOn(userService, 'findUserById').mockResolvedValue(mockUser);
      (userRepository.remove as jest.Mock).mockResolvedValue(undefined);

      await userService.deleteUser({ id: userId });

      expect(userService.findUserById).toHaveBeenCalledWith({ id: userId });
      expect(userRepository.remove).toHaveBeenCalledWith(mockUser);
      expect(logger.log).toHaveBeenCalledWith(SysMessages.DELETE_USER_SUCCESS);
    });

    it('should throw NotFoundException if user not found', async () => {

      jest
        .spyOn(userService, 'findUserById')
        .mockRejectedValue(new NotFoundException(SysMessages.USER_NOT_FOUND));

      await expect(userService.deleteUser({ id: userId })).rejects.toThrow(
        new NotFoundException(SysMessages.USER_NOT_FOUND),
      );

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: SysMessages.USER_NOT_FOUND,
          name: 'NotFoundException',
        }),
      );
    });

    it('should throw InternalServerErrorException on database error', async () => {

      jest.spyOn(userService, 'findUserById').mockResolvedValue(mockUser);
      (userRepository.remove as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(userService.deleteUser({ id: userId })).rejects.toThrow(
        new InternalServerErrorException(SysMessages.DELETE_USER_ERROR),
      );

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: SysMessages.DELETE_USER_ERROR,
          error: 'Database error',
        }),
      );
    });

    it('should log specific error details on failure', async () => {
      const testError = new Error('Test error');
      testError.name = 'TestError';
      testError.stack = 'Test stack trace';

      jest.spyOn(userService, 'findUserById').mockRejectedValue(testError);

      await expect(userService.deleteUser({ id: userId })).rejects.toThrow(
        InternalServerErrorException,
      );

      expect(logger.error).toHaveBeenCalledWith({
        message: SysMessages.DELETE_USER_ERROR,
        error: 'Test error',
        stack: 'Test stack trace',
        name: 'TestError',
        code: null,
        email: null,
      });
    });
  });
});
