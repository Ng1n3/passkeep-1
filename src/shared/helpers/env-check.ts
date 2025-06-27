import { config } from 'dotenv';

config();

export const checkEnv = () => {
  const requriedEnvVars = [
    'JWT_PRIVATE_KEY',
    'JWT_PUBLIC_KEY',
    'JWT_ISSUER',
    'JWT_AUDIENCE',
    'JWT_ACCESS_TOKEN_EXPIRATION',
    'JWT_REFRESH_TOKEN_EXPIRATION',
    'JWT_ALGORITHM',
    'IS_PUBLIC_KEY',
  ];

  requriedEnvVars.forEach((envVar) => {
    if (!process.env[envVar]) {
      throw new Error(`${envVar} is not defined in environment variables`);
    }
  });
};
