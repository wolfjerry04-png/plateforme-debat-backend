import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LeconsService } from './lecons.service';
import { LeconsController } from './lecons.controller';

@Module({
  imports: [PrismaModule],
  providers: [LeconsService],
  controllers: [LeconsController],
})
export class LeconsModule {}