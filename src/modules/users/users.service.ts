import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PasswordConfig } from 'src/utils/user.utils';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly passwordConfig: PasswordConfig,
  ) {}

  private toResponse(user: User): UserResponseDto {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      is_activated: user.is_activated,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }
  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    try {
      const existingUsername = await this.userRepository.findOne({
        where: { username: createUserDto.username },
      });

      if (existingUsername) {
        throw new ConflictException(
          'User with this username already exists please choose another one',
        );
      }

      const existingEmail = await this.userRepository.findOne({
        where: { email: createUserDto.email },
      });

      if (existingEmail) {
        throw new ConflictException(
          'User with this email already exists please login',
        );
      }

      const { username, email, password } = createUserDto;

      const user = new User();
      user.username = username;
      user.email = email;
      user.password = await this.passwordConfig.hashPassword(password);

      const savedUser = await this.userRepository.save(user);
      return this.toResponse(savedUser);
    } catch (error: any) {
      if (error instanceof ConflictException) {
        throw error;
      }
      console.error('Error creating user: ', error);
      throw new InternalServerErrorException('Failed to create user');
    }
  }

  async findAll(): Promise<UserResponseDto[]> {
    try {
      const users = await this.userRepository.find();
      return users.map((user) => this.toResponse(user));
    } catch (error: any) {
      console.error('Error fetching users:', error);
      throw new InternalServerErrorException('Failed to fetch users');
    }
  }

  async findOne(id: string): Promise<UserResponseDto> {
    try {
      const user = await this.userRepository.findOne({ where: { id } });
      if (!user) {
        throw new NotFoundException(`User with id ${id} not found`);
      }

      return this.toResponse(user);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error fetching user: ', error);
      throw new InternalServerErrorException('Failed to fetch user');
    }
  }

  async findByEmail(email: string): Promise<UserResponseDto> {
    try {
      const user = await this.userRepository.findOne({ where: { email } });
      if (!user) {
        throw new NotFoundException(`User with email ${email} not found`);
      }

      return this.toResponse(user);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error fetching user: ', error);
      throw new InternalServerErrorException('Failed to fetch user');
    }
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    try {
      const user = await this.userRepository.findOne({ where: { id } });
      if (!user) {
        throw new NotFoundException(`User with id ${id} not found`);
      }
      const updatedUser = await this.userRepository.save({
        ...user,
        ...updateUserDto,
      });
      return this.toResponse(updatedUser);
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error updating user: ', error);
      throw new InternalServerErrorException('Failed to update user');
    }
  }

  async remove(id: string): Promise<{ message: string }> {
    try {
      const user = await this.userRepository.findOne({ where: { id } });
      if (!user) {
        throw new NotFoundException(`User with id ${id} not found`);
      }
      await this.userRepository.delete(id);
      return { message: `This action removes a #${id} user` };
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error deleting user: ', error);
      throw new InternalServerErrorException('Failed to delete user');
    }
  }
}
