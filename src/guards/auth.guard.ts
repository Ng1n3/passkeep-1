import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Logger } from 'nestjs-pino';
import { IS_PUBLIC_KEY } from 'src/common/decorators/public.decorator';
import { AuthenticatedRequest } from 'src/common/types/express-request.types';
import { JwtUtils } from 'src/utils/jwt.utils';
import * as SysMessages from '../shared/constants/systemMessages';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger: Logger;
  constructor(
    private reflector: Reflector,
    logger: Logger,
  ) {
    this.logger = logger;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException(SysMessages.NOT_FOUND_ACCESS_TOKEN);
    }

    try {
      const payload = await Promise.resolve(JwtUtils.verifyAccessToken(token));

      request.user = payload;
      return true;
    } catch (error: any) {
      this.logger.error({
        message: SysMessages.CAN_ACTIVATE_ERROR,
        error: error.message,
        stack: error.stack,
        email: null,
      });
      throw new UnauthorizedException(
        error.message || SysMessages.INVALID_ACCESSTOKEN,
      );
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
