import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { Logger } from 'nestjs-pino';
import * as SysMessages from '../../shared/constants/systemMessages';
import {
  AuthCreationResponse,
  AuthLoginResponse,
  RefreshTokenResponse,
} from '../../shared/interfaces/auth';
import { JwtPayload, JwtUtils } from '../../utils/jwt.utils';
import { UsersService } from '../users/users.service';
import { AuthLoginDto, CreateAuthDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger: Logger;
  constructor(
    private readonly userService: UsersService,
    logger: Logger,
  ) {
    this.logger = logger;
  }

  async create(createAuthDto: CreateAuthDto): Promise<AuthCreationResponse> {
    try {
      const user = await this.userService.createUser(createAuthDto);
      const payload: JwtPayload = {
        id: user.id.toString(),
        email: user.email,
      };

      const { accessToken, refreshToken } = JwtUtils.generateTokenPair(payload);

      console.log('refresh token: ', refreshToken);

      await this.userService.updatedUserRefreshToken(user.id, refreshToken);

      this.logger.log(SysMessages.SIGNUP_SUCCESSFUL);

      return { user, accessToken, refreshToken };
    } catch (error: any) {
      this.logger.error({
        message: SysMessages.SIGNUP_ERROR,
        error: error.message,
        stack: error.stack,
        email: createAuthDto.email,
      });
      throw new InternalServerErrorException(SysMessages.SIGNUP_ERROR);
    }
  }

  async login(loginDetails: AuthLoginDto): Promise<AuthLoginResponse> {
    try {
      const user = await this.userService.findUserByEmail(loginDetails.email);
      if (!user) {
        this.logger.warn(SysMessages.INVALID_CREDENTIAL);
        throw new BadRequestException(SysMessages.INVALID_CREDENTIAL);
      }

      const payload: JwtPayload = {
        id: user.id.toString(),
        email: user.email,
      };

      let refreshToken = user.refresh_token;
      let shouldUpdateRefreshToken = true;

      if (refreshToken) {
        try {
          JwtUtils.verifyRefreshToken(refreshToken);
          shouldUpdateRefreshToken = false;
        } catch {
          shouldUpdateRefreshToken = true;
        }
      }

      if (shouldUpdateRefreshToken) {
        refreshToken = JwtUtils.generateRefreshToken(payload);
        await this.userService.updatedUserRefreshToken(user.id, refreshToken);
      }

      const accessToken = JwtUtils.generateAccessToken(payload);

      this.logger.log(SysMessages.SIGNIN_SUCCESSFUL);
      return {
        user,
        accessToken,
        refreshToken: shouldUpdateRefreshToken ? refreshToken : undefined,
      };
    } catch (error: any) {
      this.logger.error({
        message: SysMessages.SIGNIN_ERROR,
        error: error.message,
        stack: error.stack,
        email: loginDetails.email,
      });

      throw new InternalServerErrorException(SysMessages.SIGNIN_ERROR);
    }
  }

  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    if (!refreshToken) {
      throw new BadRequestException(SysMessages.REFRESH_TOKEN_NOT_FOUND);
    }

    try {
      const decoded = JwtUtils.verifyRefreshToken(refreshToken);
      const user = await this.userService.findByRefreshToken(refreshToken);

      if (!user) {
        throw new UnauthorizedException(SysMessages.INVALID_REFRESH_TOKEN);
      }

      if (decoded.id !== user.id.toString()) {
        throw new UnauthorizedException(SysMessages.INVALID_REFRESH_TOKEN);
      }

      if (decoded.email !== user.email) {
        throw new UnauthorizedException(SysMessages.INVALID_REFRESH_TOKEN);
      }

      const payload: JwtPayload = {
        id: user.id.toString(),
        email: user.email,
      };

      const accessToken = JwtUtils.generateAccessToken(payload);

      return { accessToken };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedException(SysMessages.REFRESH_TOKEN_EXPIRED);
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedException(SysMessages.INVALID_REFRESH_TOKEN);
      } else if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(`Failed to refresh access token`, error.stack);
      throw new InternalServerErrorException(SysMessages.INTERNAL_SERVER_ERROR);
    }
  }

  async signout(userId: string): Promise<void> {
    try {
      const user = await this.userService.findUserById(userId);
      if (!user) {
        this.logger.warn(SysMessages.USER_NOT_FOUND);
        throw new NotFoundException(SysMessages.USER_NOT_FOUND);
      }
      const checkNullRefreshToken = await this.userService.findByRefreshToken(
        user.refresh_token!,
      );
      if (checkNullRefreshToken === null) {
        this.logger.warn(SysMessages.ALREADY_SIGNED_OUT);
        throw new ConflictException(SysMessages.ALREADY_SIGNED_OUT);
      }

      this.logger.log(SysMessages.SIGN_OUT_SUCCESSFULL);
      await this.userService.clearRefreshToken(userId);
    } catch (error) {
      this.logger.error({
        message: SysMessages.SIGN_OUT_ERROR,
        error: error.message,
        stack: error.stack,
        email: null,
      });

      throw new InternalServerErrorException(SysMessages.SIGN_OUT_ERROR);
    }
  }
}
