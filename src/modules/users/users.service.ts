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
import { PasswordConfig } from 'src/utils/user.utils';
import { Repository } from 'typeorm';
import * as SysMessages from '../../shared/constants/systemMessages';
import { CreateUserDto } from './dto/create-user.dto';
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
        ...createUserDto,
        password: await this.passwordConfig.hashPassword(
          createUserDto.password,
        ),
      });

      return this.userRepository.save(user);
    } catch (error: any) {
      if (error instanceof ConflictException) {
        throw error;
      }
      console.error(SysMessages.CREATE_USER_ERROR, error);
      throw new InternalServerErrorException(SysMessages.CREATE_USER_ERROR);
    }
  }

  async findAllUsers(): Promise<User[]> {
    try {
      return this.userRepository.find();
    } catch (error: any) {
      console.error(SysMessages.FETCH_USER_ERROR, error);
      throw new InternalServerErrorException(SysMessages.FETCH_USER_ERROR);
    }
  }

  async findUserById(id: string): Promise<User> {
    try {
      const user = await this.userRepository.findOne({ where: { id } });
      if (!user) {
        throw new NotFoundException(`User with id ${id} not found`);
      }
      return user;
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error(SysMessages.FETCH_USER_ERROR, error);
      throw new InternalServerErrorException(SysMessages.FETCH_USER_ERROR);
    }
  }

  async findUserByEmail(email: string): Promise<User> {
    try {
      const user = await this.userRepository.findOne({ where: { email } });
      if (!user) {
        throw new NotFoundException(`User with email ${email} not found`);
      }
      return user;
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error(SysMessages.FETCH_USER_ERROR, error);
      throw new InternalServerErrorException(SysMessages.FETCH_USER_ERROR);
    }
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    try {
      const user = await this.findUserById(id);

      if (!user) {
        throw new NotFoundException(`User with this id ${id} does not exist`);
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

  async deleteUser(id: string): Promise<void> {
    try {
      const user = await this.findUserById(id);
      if (!user) {
        throw new NotFoundException(`User with this id ${id} does not exist`);
      }
      await this.userRepository.remove(user);
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error(SysMessages.DELETE_USER_ERROR, error);
      throw new InternalServerErrorException(SysMessages.DELETE_USER_ERROR);
    }
  }

  async updatedUserRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<User> {
    try {
      const user = await this.findUserById(userId);
      if (!user) {
        throw new NotFoundException(`User with id ${userId} not found`);
      }

      return this.userRepository.save({
        ...user,
        refresh_token: refreshToken,
      });
    } catch (error: any) {
      console.error(`Error updating user refreshToken: ${error}`);
      throw new InternalServerErrorException(
        'Failed to update user refresh token',
      );
    }
  }

  async findByRefreshToken(refreshToken: string): Promise<User> {
    try {
      const user = await this.userRepository.findOne({
        where: { refresh_token: refreshToken },
      });

      if (!user) {
        throw new NotFoundException(
          `user with refreshToken ${refreshToken} not found`,
        );
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
        this.logger.warn(SysMessages.USER_NOT_FOUND);
        throw new NotFoundException(SysMessages.USER_NOT_FOUND);
      }

      await this.userRepository.update(userId, {
        refresh_token: null,
        last_signout_at: new Date(),
      });
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

  private async validateUniqueConstraints(
    username: string,
    email: string,
  ): Promise<void> {
    const existingUsername = await this.userRepository.findOne({
      where: { username },
    });
    if (existingUsername) {
      throw new ConflictException('User with this username already exists');
    }

    const existingEmail = await this.userRepository.findOne({
      where: { email },
    });
    if (existingEmail) {
      throw new ConflictException('User with this email already exists');
    }
  }

  private confirmPassword(password_1: string, password_2: string): boolean {
    return password_1 === password_2;
  }
}
