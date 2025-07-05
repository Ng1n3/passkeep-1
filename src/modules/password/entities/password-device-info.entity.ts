import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Password } from './password.entity';

@Entity('password_device_infos')
export class PasswordDeviceInfo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  password_id: string;

  @ManyToOne(() => Password, (password) => password.device_infos, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'password_id' })
  password: Password;

  @Column()
  device_name: string;

  @Column()
  device_type: string;

  @Column()
  ip_address: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  accessed_at: Date;
}
