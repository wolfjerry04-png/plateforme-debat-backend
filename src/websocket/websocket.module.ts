import { Module } from '@nestjs/common';
import { DebatsGateway } from './debats.gateway';

@Module({
  providers: [DebatsGateway],
  exports:   [DebatsGateway],
})
export class WebsocketModule {}
