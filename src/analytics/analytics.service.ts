import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // Tableau de bord admin — toutes les métriques
  async getMetriques() {
    const [
      totalUtilisateurs,
      totalDebats,
      totalMessages,
      totalVotes,
      debatsOuverts,
      utilisateursParRole,
      debatsParMois,
    ] = await Promise.all([

      // Comptages globaux
      this.prisma.user.count(),
      this.prisma.debat.count(),
      this.prisma.message.count(),
      this.prisma.vote.count(),

      // Débats actuellement ouverts
      this.prisma.debat.count({ where: { statut: 'OUVERT' } }),

      // Répartition par rôle
      this.prisma.user.groupBy({
        by: ['role'],
        _count: { role: true },
      }),

      // 6 derniers débats créés
      this.prisma.debat.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        select: {
          titre: true,
          statut: true,
          createdAt: true,
          _count: { select: { messages: true } },
        },
      }),
    ]);

    return {
      totaux: {
        utilisateurs: totalUtilisateurs,
        debats: totalDebats,
        messages: totalMessages,
        votes: totalVotes,
        debatsOuverts,
      },
      utilisateursParRole,
      debatsRecents: debatsParMois,
    };
  }

  // Top débats les plus actifs
  async getTopDebats() {
    return this.prisma.debat.findMany({
      take: 5,
      orderBy: { messages: { _count: 'desc' } },
      include: {
        createur: { select: { prenom: true, nom: true } },
        _count: { select: { messages: true } },
      },
    });
  }

  // Top contributeurs
  async getTopContributeurs() {
    return this.prisma.user.findMany({
      take: 5,
      orderBy: { messages: { _count: 'desc' } },
      select: {
        id: true,
        prenom: true,
        nom: true,
        role: true,
        photoUrl: true,
        _count: { select: { messages: true, votes: true } },
      },
    });
  }
}