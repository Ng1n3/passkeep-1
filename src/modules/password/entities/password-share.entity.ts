import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../../modules/users/entities/user.entity';
import { Password } from './password.entity';

@Entity('password_shares')
export class PasswordShare {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  password_id: string;

  @ManyToOne(() => Password, (password) => password.shares, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'password_id' })
  password: Password;

  @Column({ type: 'uuid' })
  shared_with_user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shared_with_user_id' })
  shared_with_user: User;
}
