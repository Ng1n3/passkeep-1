import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PasswordConfig } from 'src/utils/user.utils';
import { Repository } from 'typeorm';
import * as SysMessages from '../../shared/constants/systemMessages';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly passwordConfig: PasswordConfig,
  ) {}

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    try {
      await this.validateUniqueConstraints(
        createUserDto.username,
        createUserDto.email,
      );

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
}
