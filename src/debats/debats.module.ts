import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DebatsService } from './debats.service';
import { DebatsController } from './debats.controller';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports:     [PrismaModule, WebsocketModule],
  providers:   [DebatsService],
  controllers: [DebatsController],
  exports:     [DebatsService],
})
export class DebatsModule {}
