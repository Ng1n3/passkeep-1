import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateGoogleUserDto {
  @ApiProperty({
    description: 'Username for this account',
    example: 'sam_lex',
    minLength: 3,
    maxLength: 20,
  })
  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters' })
  @MaxLength(20, { message: 'Username must have a maximum of 20 characters' })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message:
      'Username can only contain letters, numbers, underscores, and hyphens',
  })
  username: string;

  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email: string;

  @ApiProperty({ description: 'Google ID' })
  @IsString()
  googleId: string;

  @ApiProperty({ description: 'Profile picture URL', required: false })
  @IsString()
  picture?: string;

  @ApiProperty({ description: 'OAuth provider', example: 'google' })
  @IsString()
  provider: string;
}
