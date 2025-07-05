import { registerAs } from '@nestjs/config';

export default registerAs('google-oauth', () => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    throw new Error('GOOGLE_CLIENT_ID is not defined');
  }

  if (!process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error('GOOGLE_CLIENT_SECRET is not defined');
  }

  if (!process.env.GOOGLE_OAUTH_REDIRECT_URL) {
    throw new Error('GOOGLE_OAUTH_REDIRECT_URL is not defined');
  }

  return {
    google_client_id: process.env.GOOGLE_CLIENT_ID,
    google_client_secret: process.env.GOOGLE_CLIENT_SECRET,
    google_oauth_redirect_url: process.env.GOOGLE_OAUTH_REDIRECT_URL,
  };
});
