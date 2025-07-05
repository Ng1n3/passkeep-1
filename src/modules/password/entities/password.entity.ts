import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { AbstractBaseEntity } from '../../../entities/base.entity';
import { User } from '../../../modules/users/entities/user.entity';
import { PasswordDeviceInfo } from './password-device-info.entity';
import { Folder } from './password-folder.entity';
import { PasswordShare } from './password-share.entity';
import { PasswordTwoFactorCode } from './password-twofactor-code.entity';

@Entity('passwords')
@Index(['user_id', 'title'])
export class Password extends AbstractBaseEntity {
  @Column({ nullable: false, type: 'varchar', length: 255 })
  title: string;

  @Column({ nullable: true, type: 'varchar', length: 500 })
  description?: string | null;

  @Column({ nullable: false, type: 'varchar', length: 255 })
  website_url: string;

  @Column({ nullable: false, type: 'varchar', length: 255 })
  username: string;

  @Column({ nullable: false, type: 'text' })
  password: string;

  @Column({ nullable: true, type: 'varchar', length: 255 })
  email?: string | null;

  @Column({ nullable: true, type: 'text' })
  notes?: string | null;

  @Column({ nullable: true, type: 'varchar', length: 100 })
  category?: string | null;

  @Column({ nullable: false, default: false })
  is_favorite: boolean;

  @Column({ nullable: true, type: 'json' })
  tags?: string[] | null;

  @Column({ nullable: true, type: 'varchar', length: 255 })
  icon_url?: string | null;

  @Column({ nullable: true, type: 'timestamp' })
  last_used_at?: Date | null;

  @Column({ nullable: true, type: 'timestamp', default: null })
  expires_at?: Date | null;

  @Column({ nullable: false, default: false })
  requires_two_factor: boolean;

  @Column({ nullable: false, default: 0 })
  usage_count: number;

  @Column({ nullable: false, default: true })
  is_active: boolean;

  @Column({ name: 'user_id', type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ nullable: true, type: 'timestamp' })
  last_password_change?: Date | null;

  @Column({ nullable: false, default: 0 })
  failed_access_attempts: number;

  @Column({ nullable: true, type: 'timestamp' })
  locked_until?: Date | null;

  @Column({ nullable: false, default: false })
  is_shared: boolean;

  @Column({ nullable: false, default: 'personal' })
  folder_name: string;

  @Column({ nullable: true, type: 'uuid' })
  folder_id?: string;

  @Column({ nullable: true, type: 'timestamp', default: null })
  deleted_at?: Date | null;

  // RELATIONSHIPS
  @ManyToOne(() => Folder, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'folder_id' })
  folder: Folder;

  @OneToMany(() => PasswordDeviceInfo, (deviceInfo) => deviceInfo.password)
  device_infos: PasswordDeviceInfo[];

  @OneToMany(() => PasswordShare, (share) => share.password)
  shares: PasswordShare[];

  @OneToMany(() => PasswordTwoFactorCode, (code) => code.password)
  twofactor_codes: PasswordTwoFactorCode[];
}
