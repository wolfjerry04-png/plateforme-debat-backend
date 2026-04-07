import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GamificationService {
  constructor(private readonly prisma: PrismaService) {}

  // Ajouter des points à un utilisateur
  async ajouterPoints(userId: string, points: number, raison: string) {
    const pointsUtilisateur = await this.prisma.pointsUtilisateur.upsert({
      where: { userId },
      update: { points: { increment: points } },
      create: { userId, points },
    });

    // Calculer le nouveau niveau (100 points par niveau)
    const nouveauNiveau = Math.floor(pointsUtilisateur.points / 100) + 1;

    if (nouveauNiveau > pointsUtilisateur.niveau) {
      await this.prisma.pointsUtilisateur.update({
        where: { userId },
        data: { niveau: nouveauNiveau },
      });

      // Notifier l'utilisateur de sa montée de niveau
      await this.prisma.notification.create({
        data: {
          type: 'MENTION',
          titre: `Niveau ${nouveauNiveau} atteint !`,
          contenu: `Félicitations ! Vous avez atteint le niveau ${nouveauNiveau}.`,
          userId,
        },
      });
    }

    return pointsUtilisateur;
  }

  // Attribuer un badge à un utilisateur
  async attribuerBadge(userId: string, type: string) {
    // Vérifier que le badge n'existe pas déjà
    const existant = await this.prisma.badge.findFirst({
      where: { userId, type: type as any },
    });

    if (existant) return existant;

    const infoBadge = this.getInfoBadge(type);

    const badge = await this.prisma.badge.create({
      data: {
        type: type as any,
        titre: infoBadge.titre,
        description: infoBadge.description,
        userId,
      },
    });

    // Notifier l'utilisateur
    await this.prisma.notification.create({
      data: {
        type: 'MENTION',
        titre: `Badge obtenu : ${infoBadge.titre}`,
        contenu: infoBadge.description,
        userId,
      },
    });

    return badge;
  }

  // Vérifier et attribuer les badges automatiquement
  async verifierBadges(userId: string) {
    const stats = await this.getStatsUtilisateur(userId);

    // Badge premier débat
    if (stats.messages >= 1) {
      await this.attribuerBadge(userId, 'PREMIER_DEBAT');
      await this.ajouterPoints(userId, 10, 'Premier message posté');
    }

    // Badge contributeur
    if (stats.messages >= 100) {
      await this.attribuerBadge(userId, 'CONTRIBUTEUR');
      await this.ajouterPoints(userId, 50, '100 messages postés');
    }

    // Badge voteur actif
    if (stats.votes >= 50) {
      await this.attribuerBadge(userId, 'VOTEUR_ACTIF');
      await this.ajouterPoints(userId, 30, '50 votes donnés');
    }
  }

  // Récupérer les stats d'un utilisateur
  async getStatsUtilisateur(userId: string) {
    const [messages, votes, debats, badges, points] = await Promise.all([
      this.prisma.message.count({ where: { auteurId: userId } }),
      this.prisma.vote.count({ where: { votantId: userId } }),
      this.prisma.debat.count({ where: { createurId: userId } }),
      this.prisma.badge.findMany({ where: { userId } }),
      this.prisma.pointsUtilisateur.findUnique({ where: { userId } }),
    ]);

    return { messages, votes, debats, badges, points };
  }

  // Classement général
  async getClassement(limite: number = 10) {
    return this.prisma.pointsUtilisateur.findMany({
      take: limite,
      orderBy: { points: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            prenom: true,
            nom: true,
            photoUrl: true,
            role: true,
          },
        },
      },
    });
  }

  // Challenges actifs
  async getChallengesActifs() {
    const maintenant = new Date();
    return this.prisma.challenge.findMany({
      where: {
        actif: true,
        dateDebut: { lte: maintenant },
        dateFin: { gte: maintenant },
      },
    });
  }

  // Créer un challenge (ADMIN)
  async creerChallenge(data: {
    titre: string;
    description: string;
    pointsRecompense: number;
    dateDebut: string;
    dateFin: string;
  }) {
    return this.prisma.challenge.create({
      data: {
        ...data,
        dateDebut: new Date(data.dateDebut),
        dateFin: new Date(data.dateFin),
      },
    });
  }

  // Infos des badges
  private getInfoBadge(type: string) {
    const badges: Record<string, { titre: string; description: string }> = {
      PREMIER_DEBAT: {
        titre: 'Premier Débat',
        description: 'Vous avez participé à votre premier débat !',
      },
      RHETEUR_ARGENTE: {
        titre: 'Rhéteur Argenté',
        description: 'Vous avez participé à 10 débats.',
      },
      RHETEUR_OR: {
        titre: 'Rhéteur d\'Or',
        description: 'Vous avez participé à 50 débats.',
      },
      CONTRIBUTEUR: {
        titre: 'Grand Contributeur',
        description: 'Vous avez posté 100 messages.',
      },
      VOTEUR_ACTIF: {
        titre: 'Voteur Actif',
        description: 'Vous avez donné 50 votes.',
      },
      CHAMPION: {
        titre: 'Champion',
        description: 'Vous avez remporté un tournoi !',
      },
      FORMATEUR_ETOILE: {
        titre: 'Formateur Étoile',
        description: 'Votre cours a été très apprécié.',
      },
    };
    return badges[type] || { titre: type, description: '' };
  }
}