import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthenticatedRequest } from 'src/common/types/express-request.types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthGuard } from '../../guards/auth.guard';
import * as SysMessages from '../../shared/constants/systemMessages';
import { CookieInterceptor } from '../../shared/interceptors/cookie.interceptor';
import { JwtPayload } from '../../utils/jwt.utils';
import { CookieService } from '../cookies/cookies.service';
import { UserResponseBody } from '../users/dto/user-response.dto';
import { AuthService } from './auth.service';
import {
  AuthResponseBody,
  RefreshResponseBody,
  SignoutResponseBody,
} from './dto/auth-response.dto';
import { AuthLoginDto, CreateAuthDto } from './dto/auth.dto';
import { GoogleOAuthService } from './google-auth.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookieService: CookieService,
    private readonly googleOAuthService: GoogleOAuthService,
  ) {}

  private formatResponse(
    user: any,
    message: string,
    statusCode = HttpStatus.OK,
    path: string,
    tokens: { accessToken: string; refreshToken?: string },
  ): AuthResponseBody {
    return {
      success: true,
      statusCode,
      timestamp: new Date().toISOString(),
      message,
      path: `/auth/${path}`,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          last_signout_at: user.last_signout_at,
          refresh_token: user.refresh_token,
          is_activated: user.is_activated,
          createdAt: user.created_at.toISOString(),
          updatedAt: user.updated_at.toISOString(),
        },
        tokens: {
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
        },
      },
    };
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(CookieInterceptor)
  @ApiOperation({
    summary: 'Sign up an account',
    description: 'This endpoint allows you to create a new user in the system',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: SysMessages.SIGNUP_SUCCESSFUL,
    type: AuthResponseBody,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: SysMessages.CREATE_USER_ERROR,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: SysMessages.USER_ALREADY_EXISTS,
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: SysMessages.INTERNAL_SERVER_ERROR,
  })
  async create(
    @Body() createAuthDto: CreateAuthDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseBody> {
    const { user, accessToken, refreshToken } =
      await this.authService.create(createAuthDto);

    this.cookieService.setRefreshTokenCookie(res, refreshToken);

    return this.formatResponse(
      user,
      SysMessages.SIGNUP_SUCCESSFUL,
      HttpStatus.OK,
      'register',
      { accessToken, refreshToken },
    );
  }

  @Post('google/callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Handle Google OAuth callback',
    description:
      'Exchanges Google auth code for tokens and signs in or registers user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Google authentication successful',
    type: AuthResponseBody,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: SysMessages.AUTH_CODE_REQUIRED,
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: SysMessages.INTERNAL_SERVER_ERROR,
  })
  async googleCallback(
    @Body('code') code: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseBody> {
    const { user, accessToken, refreshToken } =
      await this.authService.handleGoogleCallBack(code);

    if (refreshToken) {
      this.cookieService.setRefreshTokenCookie(res, refreshToken);
    }

    return this.formatResponse(
      user,
      'Google authentication successful',
      HttpStatus.OK,
      'google/callback',
      { accessToken, refreshToken: refreshToken || undefined },
    );
  }

  @Get('google/url')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get Google OAuth URL',
    description: 'Generates the Google OAuth URL for client redirection',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Google OAuth URL generated successfully',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: SysMessages.GOOGLE_AUTH_URL_ERROR,
  })
  getGoogleAuthUrl(): { url: string } {
    const url = this.googleOAuthService.getAuthURL();
    return { url };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Authenticate user',
    description: 'Logs in a user and returns access and refresh tokens',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: SysMessages.SIGNIN_SUCCESSFUL,
    type: AuthResponseBody,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: SysMessages.INVALID_CREDENTIAL,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: SysMessages.ACCOUNT_NOT_ACTIVATED,
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: SysMessages.TOO_MANY_ATTEMPTS,
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: SysMessages.INTERNAL_SERVER_ERROR,
  })
  async login(
    @Body() loginDto: AuthLoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseBody> {
    const { user, accessToken, refreshToken } =
      await this.authService.login(loginDto);

    if (refreshToken) {
      this.cookieService.setRefreshTokenCookie(res, refreshToken);
    }

    return this.formatResponse(
      user,
      SysMessages.SIGNIN_SUCCESSFUL,
      HttpStatus.OK,
      'login',
      { accessToken, refreshToken: refreshToken || undefined },
    );
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Generates a new access token using a valid refresh token',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: SysMessages.TOKEN_REFRESHED_SUCCESSFUL,
    type: RefreshResponseBody,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: SysMessages.REFRESH_TOKEN_NOT_FOUND,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: SysMessages.INVALID_REFRESH_TOKEN,
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: SysMessages.INTERNAL_SERVER_ERROR,
  })
  async refreshToken(@Req() req: Request): Promise<RefreshResponseBody> {
    console.log('Entering refreshToken 🔒 ');
    const refreshToken: string = req.cookies['refresh_token'];
    console.log('refresh token: ', refreshToken);
    const { accessToken } = await this.authService.refreshToken(refreshToken);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      timestamp: new Date().toISOString(),
      path: '/auth/refresh',
      message: SysMessages.TOKEN_REFRESHED_SUCCESSFUL,
      data: {
        access_token: accessToken,
        refresh_token: refreshToken,
      },
    };
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get user profile',
    description: 'Get user from the token',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: SysMessages.FETCH_USERS_SUCCESS,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: SysMessages.USER_NOT_FOUND,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: SysMessages.UNAUTHORIZED,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: SysMessages.INVALID_SEARCH_CREDENTIALS,
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: SysMessages.INTERNAL_SERVER_ERROR,
  })
  async GetMe(@Req() request: AuthenticatedRequest): Promise<UserResponseBody> {
    const userID = request.user?.id;
    const user = await this.authService.getCurrentUser({ id: userID });

    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: SysMessages.FETCH_USERS_SUCCESS,
      timestamp: new Date().toISOString(),
      path: '/auth/me',
      data: user,
    };
  }

  @Post('signout')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Sign out user',
    description:
      "Invalidates the current user's refresh token and signs them out",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: SysMessages.SIGN_OUT_SUCCESSFUL,
    type: SignoutResponseBody,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: SysMessages.USER_NOT_FOUND,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: SysMessages.ALREADY_SIGNED_OUT,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: SysMessages.UNAUTHORIZED,
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: SysMessages.INTERNAL_SERVER_ERROR,
  })
  async signout(@CurrentUser() user: JwtPayload): Promise<SignoutResponseBody> {
    await this.authService.signout(user.id);

    return {
      success: true,
      statusCode: HttpStatus.OK,
      timestamp: new Date().toISOString(),
      message: SysMessages.SIGN_OUT_SUCCESSFUL,
      path: '/auth/signout',
      data: null,
    };
  }
}
