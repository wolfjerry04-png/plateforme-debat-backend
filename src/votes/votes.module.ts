import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { VotesService } from './votes.service';
import { VotesController } from './votes.controller';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports:     [PrismaModule, WebsocketModule],
  providers:   [VotesService],
  controllers: [VotesController],
})
export class VotesModule {}
