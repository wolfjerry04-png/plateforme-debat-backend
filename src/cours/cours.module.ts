import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CoursService } from './cours.service';
import { CoursController } from './cours.controller';

@Module({
  imports: [PrismaModule],
  providers: [CoursService],
  controllers: [CoursController],
  exports: [CoursService],
})
export class CoursModule {}