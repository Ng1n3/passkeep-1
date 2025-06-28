import { ApiProperty } from '@nestjs/swagger';
import { BaseResponseBody } from '../../../common/dto/base-response.dto';
import { UserDataDto } from '../../../common/dto/user.dto';
import { TokenDataDto } from './token.dto';

export class AuthDataDto {
  @ApiProperty({ type: () => UserDataDto })
  user: UserDataDto;

  @ApiProperty({ type: () => TokenDataDto })
  tokens: TokenDataDto;
}

export class AuthResponseBody extends BaseResponseBody<AuthDataDto> {}

export class RefreshResponseBody extends BaseResponseBody<TokenDataDto> {}

export class SignoutResponseBody extends BaseResponseBody<null> {}
