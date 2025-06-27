import { ApiProperty } from '@nestjs/swagger';
import { UserDataDto } from 'src/common/dto/user.dto';

export class UserResponseBody {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  statusCode: number;

  @ApiProperty()
  timestamp: string;

  @ApiProperty()
  message: string;

  @ApiProperty()
  path: string;

  @ApiProperty({ type: UserDataDto })
  data: UserDataDto;
}

export class UsersListResponseBody {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  statusCode: number;

  @ApiProperty()
  timestamp: string;

  @ApiProperty()
  message: string;

  @ApiProperty()
  path: string;

  @ApiProperty({ type: [UserDataDto] })
  data: UserDataDto[];
}
