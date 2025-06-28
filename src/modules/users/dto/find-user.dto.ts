import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
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

  @ValidateIf((o) => !o.id && !o.email && !o.refreshToken)
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
  @IsString()
  @IsNotEmpty({ message: 'ID is required' })
  @Transform(({ value }: { value: string }) => value?.trim())
  id: string;
}

export class FindUserByRefreshTokenDto {
  @IsString()
  @IsNotEmpty({ message: 'Refresh token is required' })
  refreshToken: string;
}
