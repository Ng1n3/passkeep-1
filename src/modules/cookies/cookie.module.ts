import { Module } from '@nestjs/common';
import { CookieService } from './cookies.service';

@Module({
  providers: [CookieService],
  exports: [CookieService],
})
export class CookieModule {}
