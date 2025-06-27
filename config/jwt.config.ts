import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => {
  if (!process.env.JWT_PRIVATE_KEY) {
    throw new Error('JWT_PRIVATE_KEY is not defined');
  }

  if (!process.env.JWT_PUBLIC_KEY) {
    throw new Error('JWT_PUBLIC_KEY is not defined');
  }

  if (!process.env.JWT_ISSUER) {
    throw new Error('JWT_ISSUER is not defined');
  }

  if (!process.env.JWT_AUDIENCE) {
    throw new Error('JWT_AUDIENCE is not defined');
  }

  if (!process.env.JWT_ACCESS_TOKEN_EXPIRATION) {
    throw new Error('JWT_ACCESS_TOKEN_EXPIRATION is not defined');
  }

  if (!process.env.JWT_REFRESH_TOKEN_EXPIRATION) {
    throw new Error('JWT_REFRESH_TOKEN_EXPIRATION is not defined');
  }

  if (!process.env.JWT_ALGORITHM) {
    throw new Error('JWT_ALGORITHM is not defined');
  }

  if (!process.env.IS_PUBLIC_KEY) {
    throw new Error('IS_PUBLIC_KEY is not defined');
  }

  return {
    privateKey: process.env.JWT_PRIVATE_KEY,
    publicKey: process.env.JWT_PUBLIC_KEY,
    issuer: process.env.JWT_ISSUER,
    audience: process.env.JWT_AUDIENCE,
    accessTokenExpiration: process.env.JWT_ACCESS_TOKEN_EXPIRATION,
    refreshTokenExpiration: process.env.JWT_REFRESH_TOKEN_EXPIRATION,
    algorithm: process.env.JWT_ALGORITHM,
    is_public_key: process.env.IS_PUBLIC_KEY,
  };
});
