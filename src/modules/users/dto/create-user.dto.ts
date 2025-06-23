import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty()
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  username: string;

  @ApiProperty()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/[A-Z]/, {
    message: 'Password must contain at least one upper case',
  })
  @Matches(/[a-z]/, {
    message: 'Password must contain at lease one lowercase letter',
  })
  @Matches(/[0-9]/, { message: 'Password must contain at leaset one digit' })
  @Matches(/[\W_]/, {
    message:
      'Password must contain at lease one special character (e.g. !@#$%^&*)',
  })
  password: string;
}
