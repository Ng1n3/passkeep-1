import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Logger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import * as SysMessages from '../../shared/constants/systemMessages';
import { FindUserByIdDto } from '../users/dto/find-user.dto';
import { CreatePasswordDto } from './dto/create-password.dto';
import { FindPasswordByIdDto } from './dto/find-password.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { Password } from './entities/password.entity';
import { PasswordEncryptionService } from './password-encryption.service';
import { FolderService } from './password-folder.service';

@Injectable()
export class PasswordService {
  constructor(
    @InjectRepository(Password)
    private readonly passwordRepository: Repository<Password>,
    private readonly encryptionService: PasswordEncryptionService,
    private readonly folderService: FolderService,
    private readonly logger: Logger,
  ) {}

  async create(
    createPasswordDto: CreatePasswordDto,
    userID: FindUserByIdDto,
  ): Promise<Password> {
    try {
      const personalFolder = await this.folderService.ensureFolderExists({
        id: userID.id,
      });

      const hashedPassword = await this.encryptionService.hashPassword(
        createPasswordDto.password,
      );

      const password = this.passwordRepository.create({
        ...createPasswordDto,
        password: hashedPassword,
        user_id: userID.id,
        folder_id: personalFolder.id,
      });

      const savedPassword = await this.passwordRepository.save(password);

      this.logger.log(SysMessages.CREATE_PASSWORD_SUCCESSFUL);
      return savedPassword;
    } catch (error) {
      this.logger.error({
        message: SysMessages.CREATE_PASSWORD_ERROR,
        error: error.message,
        stack: error.stack,
      });
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(SysMessages.CREATE_PASSWORD_ERROR);
    }
  }

  async findAll(): Promise<Password[]> {
    try {
      const passwords = await this.passwordRepository.find();
      this.logger.log(SysMessages.FIND_ALL_PASSWORDS_SUCCESSFUL);
      return passwords;
    } catch (error) {
      this.logger.error({
        message: SysMessages.FIND_ALL_PASSWORDS_ERROR,
        error: error.message,
        stack: error.stack,
      });
      throw new InternalServerErrorException(
        SysMessages.FIND_ALL_PASSWORDS_ERROR,
      );
    }
  }

  async findOne(findPasswordByIdDto: FindPasswordByIdDto): Promise<Password> {
    try {
      const password = await this.passwordRepository.findOneBy({
        id: findPasswordByIdDto.id,
      });
      if (!password) {
        this.logger.warn(SysMessages.PASSWORD_NOT_FOUND);
        throw new NotFoundException(SysMessages.PASSWORD_NOT_FOUND);
      }
      this.logger.log(SysMessages.FIND_ONE_PASSWORD_SUCCESSFUL);
      return password;
    } catch (error) {
      this.logger.error({
        message: SysMessages.FIND_ONE_PASSWORD_ERROR,
        error: error.message,
        stack: error.stack,
      });
      throw error instanceof NotFoundException
        ? error
        : new InternalServerErrorException(SysMessages.FIND_ONE_PASSWORD_ERROR);
    }
  }

  async update(
    findPasswordByIdDto: FindPasswordByIdDto,
    updatePasswordDto: UpdatePasswordDto,
  ): Promise<Password> {
    try {
      const password = await this.passwordRepository.findOneBy({
        id: findPasswordByIdDto.id,
      });
      if (!password) {
        this.logger.warn(SysMessages.PASSWORD_NOT_FOUND);
        throw new NotFoundException(SysMessages.PASSWORD_NOT_FOUND);
      }

      if (updatePasswordDto.password) {
        password.password = await this.encryptionService.hashPassword(
          updatePasswordDto.password,
        );
      }

      this.passwordRepository.merge(password, updatePasswordDto);

      const updatedPassword = await this.passwordRepository.save(password);
      this.logger.log(SysMessages.UPDATE_PASSWORD_SUCCESSFUL);
      return updatedPassword;
    } catch (error) {
      this.logger.error({
        message: SysMessages.UPDATE_PASSWORD_ERROR,
        error: error.message,
        stack: error.stack,
      });
      throw error instanceof NotFoundException
        ? error
        : new InternalServerErrorException(SysMessages.UPDATE_PASSWORD_ERROR);
    }
  }

  async remove(id: number): Promise<void> {
    try {
      const result = await this.passwordRepository.delete(id);
      if (result.affected === 0) {
        this.logger.warn(SysMessages.PASSWORD_NOT_FOUND);
        throw new NotFoundException(SysMessages.PASSWORD_NOT_FOUND);
      }
      this.logger.log(SysMessages.REMOVE_PASSWORD_SUCCESSFUL);
    } catch (error) {
      this.logger.error({
        message: SysMessages.REMOVE_PASSWORD_ERROR,
        error: error.message,
        stack: error.stack,
      });
      throw error instanceof NotFoundException
        ? error
        : new InternalServerErrorException(SysMessages.REMOVE_PASSWORD_ERROR);
    }
  }
}
