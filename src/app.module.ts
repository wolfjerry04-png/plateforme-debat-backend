import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import configuration from './config/configuration';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DebatsModule } from './debats/debats.module';
import { MessagesModule } from './messages/messages.module';
import { VotesModule } from './votes/votes.module';
import { ProfilsModule } from './profils/profils.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { CoursModule } from './cours/cours.module';
import { LeconsModule } from './lecons/lecons.module';
import { QuizModule } from './quiz/quiz.module';
import { IaModule } from './ia/ia.module';
import { LivesModule } from './lives/lives.module';
import { GamificationModule } from './gamification/gamification.module';
import { TournoisModule } from './tournois/tournois.module';
import { PaiementsModule } from './paiements/paiements.module';
import { SponsoringModule } from './sponsoring/sponsoring.module';
import { TenantsModule } from './tenants/tenants.module';
import { StripeController } from './paiements/stripe.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: '.env',
    }),

    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),

    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ttl: 60,
        max: 100,
      }),
    }),

    AuthModule,
    UsersModule,
    DebatsModule,
    MessagesModule,
    VotesModule,
    ProfilsModule,
    NotificationsModule,
    AnalyticsModule,
    CoursModule,
    LeconsModule,
    QuizModule,
    IaModule,
    LivesModule,
    GamificationModule,
    TournoisModule,
    PaiementsModule,
    SponsoringModule,
    TenantsModule,
  ],
controllers: [StripeController],
})
export class AppModule {}
