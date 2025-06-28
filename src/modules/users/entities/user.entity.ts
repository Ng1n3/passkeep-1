import { Column, Entity } from 'typeorm';
import { AbstractBaseEntity } from '../../../entities/base.entity';

@Entity('users')
export class User extends AbstractBaseEntity {
  @Column({ nullable: false, unique: true })
  username: string;

  @Column({ nullable: false, unique: true })
  email: string;

  @Column({ nullable: false })
  password: string;

  @Column({ nullable: false, default: false })
  is_activated: boolean;

  @Column({ nullable: true, type: 'varchar', default: null })
  refresh_token: string | null;

  @Column({ nullable: true, default: null })
  last_signout_at: Date | null;
}
