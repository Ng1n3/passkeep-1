import { registerAs } from '@nestjs/config';

export default registerAs('user', () => ({
  bcryptCost: parseInt(process.env.BCRYPT_COST || '10', 10),
}));
