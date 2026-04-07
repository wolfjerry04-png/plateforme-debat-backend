import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TournoisService } from './tournois.service';
import { TournoisController } from './tournois.controller';

@Module({
  imports: [PrismaModule],
  providers: [TournoisService],
  controllers: [TournoisController],
  exports: [TournoisService],
})
export class TournoisModule {}