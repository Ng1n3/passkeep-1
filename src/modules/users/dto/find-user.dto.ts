import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class FindUserDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'ID cannot be empty' })
  @Transform(({ value }: { value: string }) => value?.trim())
  id?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Invalid Email format' })
  @IsNotEmpty({ message: 'Email cannot be empty' })
  @Transform(({ value }: { value: string }) => value?.trim())
  email?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Refresh token cannot be empty' })
  refresh_token?: string;

  @ValidateIf((o) => !o.id && !o.email && !o.refresh_token)
  @IsNotEmpty({
    message: 'At leaset one fo id, email or refreshTOken must be provided',
  })
  _atLeastOne?: any;
}

export class FindUserByEmailDto {
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  @Transform(({ value }: { value: string }) => value?.trim().toLowerCase())
  email: string;
}

export class FindUserByIdDto {
  @IsUUID('4', { message: 'ID must be a valid UUID' })
  @IsNotEmpty({ message: 'ID is required' })
  @Transform(({ value }: { value: string }) => value?.trim())
  id: string;
}

export class FindUserByRefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token to find user',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    required: true,
  })
  @IsString()
  @IsNotEmpty({ message: 'Refresh token is required' })
  refresh_token: string;
}

export class FindUserByUsernameDto {
  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters' })
  @MaxLength(20, { message: 'Username must have a maximum of 20 characters' })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message:
      'Username can only contain letters, numbers, underscores, and hyphens',
  })
  username: string;
}
