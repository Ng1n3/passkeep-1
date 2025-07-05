import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PasswordConfig } from '../../utils/user.utils';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { Folder } from './entities/password-folder.entity';
import { Password } from './entities/password.entity';
import { PasswordEncryptionService } from './password-encryption.service';
import { FolderService } from './password-folder.service';
import { PasswordController } from './password.controller';
import { PasswordService } from './password.service';

@Module({
  controllers: [PasswordController],
  providers: [
    PasswordService,
    PasswordEncryptionService,
    FolderService,
    PasswordConfig,
    UsersService,
  ],
  imports: [TypeOrmModule.forFeature([Password, Folder, User])],
  exports: [PasswordService],
})
export class PasswordModule {}
