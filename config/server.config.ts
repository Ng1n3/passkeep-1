import { registerAs } from '@nestjs/config';

export default registerAs('server', () => ({
  port: process.env.PORT || 4000,
}));
