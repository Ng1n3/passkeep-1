import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CookieOptions, Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { COOKIE_METADATA_KEY } from 'src/common/decorators/cookie.decorator';

// Define proper types for cookie settings
interface CookieSettings {
  name: string;
  options?: CookieOptions;
}

// Type for the response data structure
interface ResponseData {
  data?: {
    tokens?: {
      refresh_token?: string;
    };
  };
}

@Injectable()
export class CookieInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const response = context.switchToHttp().getResponse<Response>();
    const cookieSettings = this.reflector.get<CookieSettings | undefined>(
      COOKIE_METADATA_KEY,
      context.getHandler(),
    );

    return next.handle().pipe(
      map((data: unknown) => {
        const responseData = data as ResponseData;

        if (cookieSettings && responseData?.data?.tokens?.refresh_token) {
          const { name, options } = cookieSettings;

          if (name === 'refresh_token') {
            const cookieOptions: CookieOptions = {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'strict',
              maxAge: 7 * 24 * 60 * 60 * 1000,
              ...options, // This is now type-safe
            };

            response.cookie(
              name,
              responseData.data.tokens.refresh_token,
              cookieOptions,
            );
          }
        }
        return data;
      }),
    );
  }
}
