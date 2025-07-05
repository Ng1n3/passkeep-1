import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class PasswordResponseDto {
  @Expose()
  id: string;

  @Expose()
  title: string;

  @Expose()
  website_url: string;

  @Expose()
  username: string;

  @Expose()
  email?: string;

  @Expose()
  notes?: string;

  @Expose()
  category?: string;

  @Expose()
  is_favorite: boolean;

  @Expose()
  tags?: string[];

  @Expose()
  icon_url?: string;

  @Expose()
  strength_level: string;

  @Expose()
  requires_two_factor: boolean;

  @Expose()
  usage_count: number;

  @Expose()
  is_active: boolean;

  @Expose()
  is_shared: boolean;

  @Expose()
  folder_name: string;

  @Expose()
  folder_id?: string;

  @Expose()
  version: number;
}
