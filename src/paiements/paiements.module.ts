import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PaiementsService } from './paiements.service';
import { PaiementsController } from './paiements.controller';
import { StripeController } from './stripe.controller';

@Module({
  imports: [PrismaModule],
  providers: [PaiementsService],
  controllers: [PaiementsController, StripeController],
})
export class PaiementsModule {}
