import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') ?? 3001;
  const frontendUrl = configService.get<string>('frontend.url');

  app.use(helmet());
  app.use(compression());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:            true,
      forbidNonWhitelisted: true,
      transform:            true,
    }),
  );

  app.setGlobalPrefix('api');

  // ── CORS dynamique ──
  // En développement : accepte localhost:3000
  // En production    : lit FRONTEND_URL dans .env (supporte plusieurs URLs séparées par virgule)
  const originesAutorisees: (string | RegExp)[] = [
    'http://localhost:3000',
    'http://localhost:3001',
  ];

  if (frontendUrl) {
    // Supporte plusieurs URLs : FRONTEND_URL=https://debat-haiti.vercel.app,https://www.debathaiti.com
    frontendUrl.split(',').map((u) => u.trim()).forEach((url) => {
      originesAutorisees.push(url);
    });
  }

  // Accepte aussi tous les sous-domaines vercel.app en développement
  if (configService.get<string>('nodeEnv') !== 'production') {
    originesAutorisees.push(/\.vercel\.app$/);
    originesAutorisees.push(/localhost:\d+$/);
  }

  app.enableCors({
    origin:         originesAutorisees,
    methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
    credentials:    true,
  });

  await app.listen(port);
  console.log(`Serveur démarré : http://localhost:${port}/api`);
  console.log(`Environnement   : ${configService.get('nodeEnv')}`);
  console.log(`CORS autorisé   : ${originesAutorisees.filter(o => typeof o === 'string').join(', ')}`);
}

bootstrap();
