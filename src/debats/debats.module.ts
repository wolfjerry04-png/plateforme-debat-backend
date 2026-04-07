import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DebatsService } from './debats.service';
import { DebatsController } from './debats.controller';

@Module({
  imports: [PrismaModule],
  providers: [DebatsService],
  controllers: [DebatsController],
  exports: [DebatsService],
})
export class DebatsModule {}