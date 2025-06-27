import { ApiProperty } from '@nestjs/swagger';

export class UserDataDto {
  @ApiProperty({
    description: 'Unique identifier for the user',
    example: 'uuid-string',
  })
  id: string;

  @ApiProperty({
    description: 'Username of the user',
    example: 'sam_lex',
  })
  username: string;

  @ApiProperty({
    description: 'Email address of the user',
    example: 'user@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'Whether the user account is activated',
    example: true,
  })
  is_activated: boolean;

  @ApiProperty({
    description: 'Account creation timestamp',
    example: '2023-10-25T14:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2023-10-25T14:30:00.000Z',
  })
  updatedAt: Date;
}
