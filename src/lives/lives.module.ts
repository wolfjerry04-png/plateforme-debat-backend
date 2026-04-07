import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LivesService } from './lives.service';
import { LivesController } from './lives.controller';

@Module({
  imports: [PrismaModule],
  providers: [LivesService],
  controllers: [LivesController],
})
export class LivesModule {}