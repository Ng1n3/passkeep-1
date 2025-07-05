import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
} from 'class-validator';

export class CreatePasswordDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUrl()
  website_url: string;

  @IsString()
  username: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsBoolean()
  is_favorite?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsUrl()
  icon_url?: string;

  @IsOptional()
  @IsDateString()
  last_used_at?: string;

  @IsOptional()
  @IsDateString()
  expires_at?: string;

  @IsOptional()
  @IsBoolean()
  requires_two_factor?: boolean;

  @IsOptional()
  @IsUUID()
  user_id: string;

  @IsOptional()
  @IsDateString()
  locked_until?: string;

  @IsOptional()
  @IsBoolean()
  is_shared?: boolean;

  @IsOptional()
  @IsString()
  folder_name?: string;

  @IsOptional()
  @IsUUID()
  folder_id?: string;
}
