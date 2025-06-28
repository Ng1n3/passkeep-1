/* eslint-disable @typescript-eslint/unbound-method */
import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
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

  describe('createUser', () => {
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

  describe('Get all users', () => {
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
});
