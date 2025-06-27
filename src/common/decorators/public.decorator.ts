import { SetMetadata } from '@nestjs/common';
import { config } from 'dotenv';

config();

export const IS_PUBLIC_KEY = process.env.IS_PUBLIC_KEY;
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
