import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { CookieOptions } from 'express';
import { AuthenticatedRequest } from '../types/express-request.types';

export type CookieSettings = {
  name: string;
  options?: CookieOptions;
};

export type CookieValue = string | undefined;
export type AllCookies = Record<string, string>;

/**
 * Type-safe parameter decorator to get cookie from request
 * @param cookieName - Name of the cookie to retrieve (returns all cookies if undefined)
 */
export const Cookie = createParamDecorator(
  (
    cookieName: string | undefined,
    context: ExecutionContext,
  ): CookieValue | AllCookies => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (cookieName) {
      return request.cookies?.[cookieName] as CookieValue;
    }

    return request.cookies as AllCookies;
  },
);

/**
 * Specialized decorator to get refresh token from cookie
 */
export const RefreshTokenFromCookie = createParamDecorator(
  (_: unknown, context: ExecutionContext): string | undefined => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.cookies?.['refresh_token'] as string | undefined;
  },
);

export const COOKIE_METADATA_KEY = 'cookie_settings';

/**
 * Decorator to set cookie metadata
 * @param name - Cookie name
 * @param options - Cookie options
 */
export const SetCookie = (
  name: string,
  options: CookieOptions = {},
): MethodDecorator & ClassDecorator => {
  return SetMetadata<typeof COOKIE_METADATA_KEY, CookieSettings>(
    COOKIE_METADATA_KEY,
    { name, options },
  );
};
