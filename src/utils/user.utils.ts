import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class PasswordConfig {
  constructor(private readonly configService: ConfigService) {}

  async hashPassword(password: string): Promise<string> {
    const costFactor = this.configService.get<number>('user.bcryptCost');
    if (!costFactor) {
      throw new Error('Bcrypt cost factor is not defined in configuration');
    }
    return await bcrypt.hash(password, costFactor);
  }

  async comparePassword(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }
}
