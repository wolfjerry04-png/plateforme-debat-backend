import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SponsoringService } from './sponsoring.service';
import { SponsoringController } from './sponsoring.controller';

@Module({
  imports: [PrismaModule],
  providers: [SponsoringService],
  controllers: [SponsoringController],
  exports: [SponsoringService],
})
export class SponsoringModule {}
