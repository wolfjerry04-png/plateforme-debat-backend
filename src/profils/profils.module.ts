import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProfilsService } from './profils.service';
import { ProfilsController } from './profils.controller';

@Module({
  imports: [PrismaModule],
  providers: [ProfilsService],
  controllers: [ProfilsController],
  exports: [ProfilsService],
})
export class ProfilsModule {}