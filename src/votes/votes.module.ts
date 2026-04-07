import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { VotesService } from './votes.service';
import { VotesController } from './votes.controller';

@Module({
  imports: [PrismaModule],
  providers: [VotesService],
  controllers: [VotesController],
})
export class VotesModule {}