import * as fs from 'fs';
import * as jwt from 'jsonwebtoken';
import { SignOptions } from 'jsonwebtoken';
import ms from 'ms';
import * as path from 'path';
import { checkEnv } from '../shared/helpers/env-check';

export interface JwtPayload {
  id: string;
  email: string;
}

checkEnv();

export class JwtUtils {
  private static readonly ACCESS_TOKEN_EXPIRES_IN =
    process.env.JWT_ACCESS_TOKEN_EXPIRATION;
  private static readonly REFRESH_TOKEN_EXPIRES_IN =
    process.env.JWT_REFRESH_TOKEN_EXPIRATION;

  private static readonly PRIVATE_KEY = process.env.JWT_PRIVATE_KEY;

  private static readonly PUBLIC_KEY = process.env.JWT_PUBLIC_KEY;

  private static getPrivateKey(): string {
    try {
      return fs.readFileSync(path.resolve(JwtUtils.PRIVATE_KEY!), 'utf8');
    } catch (error: any) {
      throw new Error(
        `Failed to load access private key from ${JwtUtils.PRIVATE_KEY!}: ${error.message}`,
      );
    }
  }

  private static getPublicKey(): string {
    try {
      return fs.readFileSync(path.resolve(JwtUtils.PUBLIC_KEY!), 'utf8');
    } catch (error: any) {
      throw new Error(
        `Failed to load public  key from ${JwtUtils.PUBLIC_KEY!}: ${error.message}`,
      );
    }
  }

  static generateAccessToken(payload: JwtPayload): string {
    const privateKey = JwtUtils.getPrivateKey();
    const options: SignOptions = {
      algorithm: process.env.JWT_ALGORITHM! as jwt.Algorithm,
      expiresIn: JwtUtils.ACCESS_TOKEN_EXPIRES_IN! as ms.StringValue,
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE,
    };

    try {
      return jwt.sign(payload, privateKey, options);
    } catch (error: any) {
      console.error(`Failed to generate refresh token: ${error.message}`);
      throw new Error(`Failed to generate refresh token: ${error.message}`);
    }
  }

  static generateRefreshToken(payload: JwtPayload): string {
    const privateKey = JwtUtils.getPrivateKey();
    const options: SignOptions = {
      algorithm: process.env.JWT_ALGORITHM! as jwt.Algorithm,
      expiresIn: JwtUtils.REFRESH_TOKEN_EXPIRES_IN! as ms.StringValue,
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE,
    };

    return jwt.sign(payload, privateKey, options);
  }

  static verifyAccessToken(token: string): JwtPayload {
    try {
      const publicKey = JwtUtils.getPublicKey();
      const decoded = jwt.verify(token, publicKey, {
        algorithms: ['RS256'],
        issuer: process.env.JWT_ISSUER,
        audience: process.env.JWT_AUDIENCE,
      }) as JwtPayload;

      return decoded;
    } catch (error: any) {
      console.error(`JWT verifcation error: ${error.message}`);
      throw new Error(`Failed to verify access token: ${error.message}`);
    }
  }

  static verifyRefreshToken(token: string): JwtPayload {
    try {
      const publicKey = JwtUtils.getPublicKey();
      const decoded = jwt.verify(token, publicKey, {
        algorithms: ['RS256'],
        issuer: process.env.JWT_ISSUER,
        audience: process.env.JWT_AUDIENCE,
      }) as JwtPayload;

      return decoded;
    } catch (error: any) {
      console.error(`Failed to verify refresh token: ${error.message}`);
      throw new Error(`Failed to verify token: ${error.message}`);
    }
  }

  static generateTokenPair(payload: JwtPayload) {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload),
    };
  }
}
