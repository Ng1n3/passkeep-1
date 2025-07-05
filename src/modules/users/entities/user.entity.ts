import { AfterLoad, BeforeUpdate, Column, Entity, OneToMany } from 'typeorm';
import { AbstractBaseEntity } from '../../../entities/base.entity';
import { Password } from '../../../modules/password/entities/password.entity';
import * as SysMessages from '../../../shared/constants/systemMessages';

@Entity('users')
export class User extends AbstractBaseEntity {
  @Column({ nullable: false, unique: true })
  username: string;

  @Column({ nullable: false, unique: true })
  email: string;

  private _originalEmail: string;
  @BeforeUpdate()
  checkEmailImmutable() {
    if (this.email !== this._originalEmail) {
      throw new Error(SysMessages.CANNOT_UPDATE_EMAIL);
    }
  }

  @AfterLoad()
  loadOriginalEmail() {
    this._originalEmail = this.email;
  }

  @Column({ nullable: true, type: 'varchar' })
  password?: string | null;

  @Column({ nullable: false, default: false })
  is_activated: boolean;

  @Column({ nullable: true, type: 'varchar', default: null })
  refresh_token: string | null;

  @Column({ nullable: true, default: null, type: 'timestamp' })
  last_signout_at: Date | null;

  @Column({ nullable: true, type: 'varchar' })
  picture?: string | null;

  @Column({
    default: 'local',
    nullable: false,
  })
  provider: 'local' | 'google' | 'facebook' | 'github';

  @Column({ nullable: true, unique: true, type: 'varchar' })
  googleId?: string | null;

  // RELATIONSHIPS
  @OneToMany(() => Password, (password) => password.user)
  passwords: Password[];
}
