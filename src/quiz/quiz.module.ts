import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { QuizService } from './quiz.service';
import { QuizController } from './quiz.controller';

@Module({
  imports: [PrismaModule],
  providers: [QuizService],
  controllers: [QuizController],
})
export class QuizModule {}