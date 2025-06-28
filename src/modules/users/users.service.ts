import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Logger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import * as SysMessages from '../../shared/constants/systemMessages';
import { PasswordConfig } from '../../utils/user.utils';
import { CreateUserDto } from './dto/create-user.dto';
import {
  FindUserByEmailDto,
  FindUserByIdDto,
  FindUserByRefreshTokenDto,
  FindUserDto,
} from './dto/find-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  private readonly logger: Logger;
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly passwordConfig: PasswordConfig,
    logger: Logger,
  ) {
    this.logger = logger;
  }

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    try {
      await this.validateUniqueConstraints(
        createUserDto.username,
        createUserDto.email,
      );

      const passwordConfirm = this.confirmPassword(
        createUserDto.password,
        createUserDto.password_confirm,
      );

      if (!passwordConfirm) {
        throw new BadRequestException(SysMessages.PASSWORD_UNMATCHED);
      }

      const user = this.userRepository.create({
        username: createUserDto.username,
        email: createUserDto.email,
        password: await this.passwordConfig.hashPassword(
          createUserDto.password,
        ),
      });

      this.logger.log(SysMessages.CREATE_USER_SUCCESS);

      return this.userRepository.save(user);
    } catch (error: any) {
      this.logger.error({
        message: SysMessages.CREATE_USER_ERROR,
        error: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code || null,
        email: createUserDto.email,
      });
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(SysMessages.CREATE_USER_ERROR);
    }
  }

  async findAllUsers(): Promise<User[]> {
    try {
      const users = await this.userRepository.find();
      this.logger.log(SysMessages.FETCH_USERS_SUCCESS);

      return users;
    } catch (error: any) {
      this.logger.error({
        message: SysMessages.FETCH_USER_ERROR,
        error: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code || null,
        email: null,
      });
      throw new InternalServerErrorException(SysMessages.FETCH_USER_ERROR);
    }
  }

  async findUser(findUserDto: FindUserDto): Promise<User> {
    try {
      const whereClause: Record<string, any> = {};

      if (findUserDto.id) {
        whereClause.id = findUserDto.id;
      }
      if (findUserDto.email) {
        whereClause.email = findUserDto.email;
      }
      if (findUserDto.refresh_token) {
        whereClause.refresh_token = findUserDto.refresh_token;
      }

      if (Object.keys(whereClause).length === 0) {
        this.logger.error({
          message: SysMessages.INVALID_SEARCH_CREDENTIALS,
          searchCriteria: findUserDto,
        });
        throw new BadRequestException(SysMessages.INVALID_SEARCH_CREDENTIALS);
      }

      const user = await this.userRepository.findOne({ where: whereClause });

      if (!user) {
        throw new NotFoundException(SysMessages.USER_NOT_FOUND);
      }

      this.logger.log(SysMessages.FETCH_USERS_SUCCESS);
      return user;
    } catch (error: any) {
      let errMessage = SysMessages.FETCH_USER_ERROR;

      if (error instanceof NotFoundException) {
        errMessage = SysMessages.USER_NOT_FOUND;
      } else if (error instanceof BadRequestException) {
        errMessage = SysMessages.INVALID_SEARCH_CREDENTIALS;
      }

      this.logger.error({
        message: errMessage,
        error: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code || null,
        searchCriteria: findUserDto,
      });

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(SysMessages.FETCH_USER_ERROR);
    }
  }

  async findUserById(userID: FindUserByIdDto): Promise<User> {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userID.id },
      });
      if (!user) {
        throw new NotFoundException(SysMessages.USER_NOT_FOUND);
      }
      this.logger.log(SysMessages.FETCH_USERS_SUCCESS);
      return user;
    } catch (error: any) {
      const errMessage =
        error instanceof NotFoundException
          ? SysMessages.USER_NOT_FOUND
          : SysMessages.FETCH_USER_ERROR;
      this.logger.error({
        message: errMessage,
        error: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code || null,
        email: null,
      });
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(SysMessages.FETCH_USER_ERROR);
    }
  }

  async findUserByEmail(userEmail: FindUserByEmailDto): Promise<User> {
    try {
      const user = await this.userRepository.findOne({
        where: { email: userEmail.email },
      });
      if (!user) {
        throw new NotFoundException(SysMessages.USER_NOT_FOUND);
      }

      this.logger.log(SysMessages.FETCH_USERS_SUCCESS);
      return user;
    } catch (error: any) {
      const errMessage =
        error instanceof NotFoundException
          ? SysMessages.USER_NOT_FOUND
          : SysMessages.FETCH_USER_ERROR;

      this.logger.error({
        message: errMessage,
        error: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code || null,
        email: null,
      });
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(SysMessages.FETCH_USER_ERROR);
    }
  }

  async updateUser(
    userID: FindUserByIdDto,
    updateUserDto: UpdateUserDto,
  ): Promise<User> {
    try {
      const user = await this.findUserById(userID);

      if (!user) {
        throw new NotFoundException(SysMessages.USER_NOT_FOUND);
      }

      if (updateUserDto.password) {
        updateUserDto.password = await this.passwordConfig.hashPassword(
          updateUserDto.password,
        );
      }

      return this.userRepository.save({ ...user, ...updateUserDto });
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error(SysMessages.UPDATE_USER_ERROR, error);
      throw new InternalServerErrorException(SysMessages.UPDATE_USER_ERROR);
    }
  }

  async deleteUser(userID: FindUserByIdDto): Promise<void> {
    try {
      const user = await this.findUserById(userID);
      if (!user) {
        throw new NotFoundException(SysMessages.USER_NOT_FOUND);
      }
      await this.userRepository.remove(user);
      this.logger.log(SysMessages.DELETE_USER_SUCCESS);
    } catch (error: any) {
      let errMessage = SysMessages.DELETE_USER_ERROR;
      if (error instanceof NotFoundException) {
        errMessage = SysMessages.USER_NOT_FOUND;
      }
      this.logger.error({
        message: errMessage,
        error: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code || null,
        email: null,
      });
      if (error instanceof NotFoundException) {
        errMessage = SysMessages.USER_NOT_FOUND;
        throw error;
      }

      throw new InternalServerErrorException(SysMessages.DELETE_USER_ERROR);
    }
  }

  async updatedUserRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<User> {
    try {
      const user = await this.findUserById({ id: userId });
      if (!user) {
        throw new NotFoundException(SysMessages.USER_NOT_FOUND);
      }

      this.logger.log(SysMessages.TOKEN_UPDATE_SUCCESSFUL);
      return this.userRepository.save({
        ...user,
        refresh_token: refreshToken,
      });
    } catch (error: any) {
      let errMessage = SysMessages.TOKEN_UPDATE_UNSUCCESSFUL;

      if (error instanceof NotFoundException) {
        errMessage = SysMessages.USER_NOT_FOUND;
      }
      this.logger.error({
        message: errMessage,
        error: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code || null,
        email: null,
      });

      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        SysMessages.TOKEN_UPDATE_UNSUCCESSFUL,
      );
    }
  }

  async findUserByRefreshToken(
    refreshTokenDto: FindUserByRefreshTokenDto,
  ): Promise<User> {
    try {
      const user = await this.userRepository.findOne({
        where: { refresh_token: refreshTokenDto.refreshToken },
      });

      if (!user) {
        throw new NotFoundException(SysMessages.USER_NOT_FOUND);
      }

      return user;
    } catch (error: any) {
      console.error('Error finding user by refreshToken', error.message);
      throw new InternalServerErrorException(
        'Error finding user by refreshToken',
      );
    }
  }

  async clearRefreshToken(userId: string) {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        this.logger.error(SysMessages.USER_NOT_FOUND);
        throw new NotFoundException(SysMessages.USER_NOT_FOUND);
      }

      await this.userRepository.update(userId, {
        refresh_token: null,
        last_signout_at: new Date(),
      });

      this.logger.log(SysMessages.TOKEN_CLEAR_SUCCESSFUL);
    } catch (error: any) {
      this.logger.error({
        message: SysMessages.CLEAR_REFRESH_TOKEN_ERROR,
        error: error.message,
        stack: error.stack,
        email: null,
      });

      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        SysMessages.CLEAR_REFRESH_TOKEN_ERROR,
      );
    }
  }

  async validateUniqueConstraints(
    username: string,
    email: string,
  ): Promise<void> {
    const existingUsername = await this.userRepository.findOne({
      where: { username },
    });
    if (existingUsername) {
      throw new ConflictException(SysMessages.USER_ALREADY_EXISTS);
    }

    const existingEmail = await this.userRepository.findOne({
      where: { email },
    });
    if (existingEmail) {
      throw new ConflictException(SysMessages.USER_ALREADY_EXISTS);
    }
  }

  confirmPassword(password_1: string, password_2: string): boolean {
    return password_1 === password_2;
  }
}
