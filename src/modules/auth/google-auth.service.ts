import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Logger } from 'nestjs-pino';
import * as SysMessages from '../../shared/constants/systemMessages';

interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  verified_email: string;
  given_name: string;
  family_name: string;
  picture: string;
}

interface GoogleTokenResponse {
  access_token: string;
  expires_in: string;
  refresh_token?: string;
  scope: string;
  token_type: string;
  id_token?: string;
}

interface GoogleIdTokenPayload {
  aud: string;
  [key: string]: any;
}

@Injectable()
export class GoogleOAuthService {
  private readonly logger: Logger;
  private readonly googleOAuthURL =
    'https://accounts.google.com/o/oauth2/v2/auth';
  private readonly googleTokenURL = 'https://oauth2.googleapis.com/token';
  private readonly googleUserInfoURL =
    'https://www.googleapis.com/oauth2/v2/userinfo';

  constructor(
    private configService: ConfigService,
    logger: Logger,
  ) {
    this.logger = logger;
  }

  getAuthURL(): string {
    try {
      const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
      const redirectUri = this.configService.get<string>(
        'GOOGLE_OAUTH_REDIRECT_URL',
      );

      if (!clientId || !redirectUri) {
        throw new NotFoundException(SysMessages.OAUTH_CONFIG_NOT_FOUND);
      }

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: [
          'https://www.googleapis.com/auth/userinfo.profile',
          'https://www.googleapis.com/auth/userinfo.email',
        ].join(' '),
        response_type: 'code',
        access_type: 'offline',
        prompt: 'consent',
      });

      this.logger.log(SysMessages.GOOGLE_AUTH_URL_SUCCESSFUL);

      return `${this.googleOAuthURL}?${params.toString()}`;
    } catch (error) {
      this.logger.error({
        message: SysMessages.GOOGLE_AUTH_URL_ERROR,
        error: error.message,
        stack: error.stack,
        email: null,
      });
      throw new InternalServerErrorException(SysMessages.GOOGLE_AUTH_URL_ERROR);
    }
  }

  async exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
    try {
      const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
      const clientSecret = this.configService.get<string>(
        'GOOGLE_CLIENT_SECRET',
      );
      const redirectUri = this.configService.get<string>(
        'GOOGLE_OAUTH_REDIRECT_URL',
      );

      if (!clientId || !clientSecret || !redirectUri) {
        throw new InternalServerErrorException(
          SysMessages.OAUTH_CONFIG_NOT_FOUND,
        );
      }

      const response = await axios.post<GoogleTokenResponse>(
        this.googleTokenURL,
        new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
          code: decodeURIComponent(code),
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      this.logger.log(SysMessages.EXCHANGE_CODE_SUCCESSFUL);
      return response.data;
    } catch (error: any) {
      this.logger.error({
        message: SysMessages.EXCHANGE_CODE_ERROR,
        error: error.message,
        stack: error.stack,
        email: null,
      });

      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(SysMessages.EXCHANGE_CODE_ERROR);
    }
  }

  async getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    try {
      const response = await axios.get<GoogleUserInfo>(this.googleUserInfoURL, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      this.logger.log(SysMessages.USER_INFO_FOUND);
      return response.data;
    } catch (error: any) {
      this.logger?.error?.({
        message: SysMessages.USER_INFO_NOT_FOUND,
        error: error.message,
        stack: error.stack,
      });

      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(SysMessages.USER_INFO_NOT_FOUND);
    }
  }

  async verifyIdToken(idToken: string): Promise<GoogleIdTokenPayload> {
    try {
      const response = await axios.get<GoogleIdTokenPayload>(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`,
      );

      const payload = response.data;

      if (payload.aud !== this.configService.get<string>('GOOGLE_CLIENT_ID')) {
        throw new BadRequestException(SysMessages.INVALID_TOKEN_AUDIENCE);
      }

      this.logger.log(SysMessages.OAUTH_ID_TOKEN_VERIFCATION_SUCCESSFUL);

      return payload;
    } catch (error: any) {
      this.logger?.error?.({
        message: SysMessages.INVALID_TOKEN_AUDIENCE,
        error: error.message,
        stack: error.stack,
      });

      if (error instanceof HttpException) {
        throw error;
      }

      throw new BadRequestException(SysMessages.INVALID_TOKEN_AUDIENCE);
    }
  }
}
