import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { Logger } from 'nestjs-pino';
import { UserDataDto } from 'src/common/dto/user.dto';
import * as SysMessages from '../../shared/constants/systemMessages';
import {
  AuthCreationResponse,
  AuthLoginResponse,
  RefreshTokenResponse,
} from '../../shared/interfaces/auth';
import { JwtPayload, JwtUtils } from '../../utils/jwt.utils';
import { FindUserByIdDto } from '../users/dto/find-user.dto';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';

import { AuthLoginDto, CreateAuthDto } from './dto/auth.dto';
import { GoogleOAuthService } from './google-auth.service';

@Injectable()
export class AuthService {
  private readonly logger: Logger;
  constructor(
    private readonly userService: UsersService,
    private googleOAuthService: GoogleOAuthService,
    logger: Logger,
  ) {
    this.logger = logger;
  }

  async create(createAuthDto: CreateAuthDto): Promise<AuthCreationResponse> {
    try {
      const user = await this.userService.createUser({
        ...createAuthDto,
        passwords: [],
      });
      const payload: JwtPayload = {
        id: user.id.toString(),
        email: user.email,
      };

      const { accessToken, refreshToken } = JwtUtils.generateTokenPair(payload);

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
      const user = await this.userService.findUserByEmail({
        email: loginDetails.email,
      });
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

  async refreshToken(
    refreshToken: string | undefined,
  ): Promise<RefreshTokenResponse> {
    if (!refreshToken) {
      throw new BadRequestException(SysMessages.REFRESH_TOKEN_NOT_FOUND);
    }

    try {
      const decoded = JwtUtils.verifyRefreshToken(refreshToken);
      const user = await this.userService.findUserByRefreshToken({
        refresh_token: refreshToken,
      });

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

  async getCurrentUser(findUserDto: FindUserByIdDto): Promise<UserDataDto> {
    try {
      const user = await this.userService.findUserById({ id: findUserDto.id });

      if (!user) {
        throw new NotFoundException(SysMessages.USER_NOT_FOUND);
      }

      this.logger.log(SysMessages.FETCH_USERS_SUCCESS);
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        is_activated: user.is_activated,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        last_signout_at: user.last_signout_at,
        refresh_token: user.refresh_token,
      };
    } catch (error: any) {
      let errMessage = SysMessages.FETCH_USER_ERROR;

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

      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(SysMessages.FETCH_USER_ERROR);
    }
  }

  async signout(userId: string): Promise<void> {
    try {
      const user = await this.userService.findUserById({ id: userId });
      if (!user) {
        throw new NotFoundException(SysMessages.USER_NOT_FOUND);
      }
      const checkNullRefreshToken =
        await this.userService.findUserByRefreshToken({
          refresh_token: user.refresh_token!,
        });
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

  async handleGoogleCallBack(code: string) {
    if (!code) {
      throw new BadRequestException(SysMessages.AUTH_CODE_REQUIRED);
    }

    const tokenResponse =
      await this.googleOAuthService.exchangeCodeForTokens(code);

    const googleUser = await this.googleOAuthService.getUserInfo(
      tokenResponse.access_token,
    );

    console.log('google user: ', googleUser);

    if (!googleUser.verified_email) {
      throw new BadRequestException(SysMessages.GOOGLE_EMAIL_NOT_VERIFIED);
    }

    let user = await this.userService.findUserByEmailOrNull({
      email: googleUser.email,
    });

    console.log('After searching for user by email');

    if (!user) {
      const baseUsername = `${googleUser.given_name}${googleUser.family_name}`
        .replace(/[^a-zA-Z0-9_-]/g, '')
        .toLowerCase()
        .slice(0, 15);

      let username = baseUsername;
      let exists = await this.userService.findUserByUsernameOrNull({
        username,
      });

      while (exists) {
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        username = `${baseUsername}_${randomSuffix}`;
        exists = await this.userService.findUserByUsernameOrNull({ username });
      }

      user = await this.userService.createGoogleUser({
        email: googleUser.email,
        username,
        googleId: googleUser.id,
        picture: googleUser.picture,
        provider: 'google',
      });
    }

    const payload: JwtPayload = {
      id: user.id.toString(),
      email: user.email,
    };

    const { accessToken, refreshToken } = JwtUtils.generateTokenPair(payload);

    await this.userService.updatedUserRefreshToken(user.id, refreshToken);

    return { user, accessToken, refreshToken };
  }

  private mapToUserDataDto(user: User): UserDataDto {
    return {
      id: user.id.toString(),
      username: user.username,
      email: user.email,
      is_activated: user.is_activated,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      last_signout_at: user.last_signout_at,
      refresh_token: user.refresh_token,
    };
  }
}
