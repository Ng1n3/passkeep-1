import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import * as SysMessages from '../../shared/constants/systemMessages';
import { AuthenticatedRequest } from '../types/express-request.types';

export const CurrentUser = createParamDecorator(
  (data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user) {
      throw new UnauthorizedException(SysMessages.UNAUTHORIZED);
    }
    return request.user;
  },
);
