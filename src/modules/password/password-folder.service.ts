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
import { UsersService } from '../users/users.service';
import { Folder } from './entities/password-folder.entity';

@Injectable()
export class FolderService {
  constructor(
    @InjectRepository(Folder)
    private folderRepository: Repository<Folder>,
    private readonly userService: UsersService,
    private readonly logger: Logger,
  ) {}

  async ensureFolderExists(findUserByIdDto: FindUserByIdDto): Promise<Folder> {
    try {
      const userExists = await this.userService.findUserById({
        id: findUserByIdDto.id,
      });

      if (!userExists) {
        throw new NotFoundException(SysMessages.USER_NOT_FOUND);
      }

      let folder = await this.folderRepository.findOne({
        where: { user_id: findUserByIdDto.id, name: 'personal' },
      });

      if (!folder) {
        folder = await this.folderRepository.save({
          name: 'personal',
          user_id: findUserByIdDto.id,
        });
      }

      this.logger.log(SysMessages.FOLDER_CREATED);
      return folder;
    } catch (error) {
      this.logger.error({
        message: SysMessages.ERROR_ENSURE_FOLDER_EXISTS,
        error: error.message,
        stack: error.stack,
      });

      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(
        SysMessages.ERROR_ENSURE_FOLDER_EXISTS,
      );
    }
  }
}
