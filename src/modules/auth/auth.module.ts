import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { CookieService } from '../cookies/cookies.service';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [UsersModule, LoggerModule.forRoot()],
  controllers: [AuthController],
  providers: [AuthService, CookieService],
})
export class AuthModule {}
