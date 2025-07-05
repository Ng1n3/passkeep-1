import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { Logger } from 'nestjs-pino';
import * as SysMessages from '../../shared/constants/systemMessages';

@Injectable()
export class PasswordEncryptionService {
  constructor(private readonly logger: Logger) {}

  /**
   * Hash a plain password using Argon2
   */
  async hashPassword(plainPassword: string): Promise<string> {
    try {
      const hash = await argon2.hash(plainPassword, {
        type: argon2.argon2id,
        memoryCost: 2 ** 16,
        timeCost: 5,
        parallelism: 1,
      });

      this.logger.log(SysMessages.HASH_SUCCESSFUL);
      return hash;
    } catch (error) {
      this.logger.error({
        message: SysMessages.HASH_ERROR,
        error: error.message,
        stack: error.stack,
      });
      throw new InternalServerErrorException(SysMessages.HASH_ERROR);
    }
  }

  /**
   * Verify a plain password against a hash
   */
  async verifyPassword(hash: string, plainPassword: string): Promise<boolean> {
    try {
      const isMatch = await argon2.verify(hash, plainPassword);

      if (isMatch) {
        this.logger.log(SysMessages.VERIFY_SUCCESSFUL);
      } else {
        this.logger.warn(SysMessages.VERIFY_FAILED);
      }

      return isMatch;
    } catch (error) {
      this.logger.error({
        message: SysMessages.VERIFY_ERROR,
        error: error.message,
        stack: error.stack,
      });
      throw new InternalServerErrorException(SysMessages.VERIFY_ERROR);
    }
  }

  /**
   * Generate a random strong password
   */
  generateStrongPassword(length = 16): string {
    try {
      const chars =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+{}[]<>?,.';
      let password = '';
      for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      this.logger.log(SysMessages.PASSWORD_GENERATION_SUCCESSFUL);
      return password;
    } catch (error) {
      this.logger.error({
        message: SysMessages.PASSWORD_GENERATION_ERROR,
        error: error.message,
        stack: error.stack,
      });
      throw new InternalServerErrorException(
        SysMessages.PASSWORD_GENERATION_ERROR,
      );
    }
  }

  /**
   * Check if a hash needs rehashing (e.g. if Argon2 parameters have changed)
   */
  needsRehash(hash: string): boolean {
    try {
      const needsRehash = argon2.needsRehash(hash, {
        memoryCost: 2 ** 16,
        timeCost: 5,
        parallelism: 1,
      });

      if (needsRehash) {
        this.logger.warn(SysMessages.NEEDS_REHASH);
      } else {
        this.logger.log(SysMessages.NO_REHASH_NEEDED);
      }

      return needsRehash;
    } catch (error) {
      this.logger.error({
        message: SysMessages.REHASH_CHECK_ERROR,
        error: error.message,
        stack: error.stack,
      });
      throw new InternalServerErrorException(SysMessages.REHASH_CHECK_ERROR);
    }
  }
}
