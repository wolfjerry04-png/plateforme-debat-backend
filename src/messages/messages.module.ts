import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports:     [PrismaModule, WebsocketModule],
  providers:   [MessagesService],
  controllers: [MessagesController],
})
export class MessagesModule {}
