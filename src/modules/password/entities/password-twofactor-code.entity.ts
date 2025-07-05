import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Password } from './password.entity';

@Entity('password_twofactor_codes')
export class PasswordTwoFactorCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  password_id: string;

  @ManyToOne(() => Password, (password) => password.twofactor_codes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'password_id' })
  password: Password;

  @Column()
  hashed_code: string;

  @Column({ default: false })
  used: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}
