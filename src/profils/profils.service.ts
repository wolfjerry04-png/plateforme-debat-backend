import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ModifierProfilDto } from './dto/modifier-profil.dto';

@Injectable()
export class ProfilsService {
  constructor(private readonly prisma: PrismaService) {}

  // Récupérer le profil complet d'un utilisateur avec ses statistiques
  async getProfil(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        prenom: true,
        nom: true,
        role: true,
        bio: true,
        photoUrl: true,
        ville: true,
        createdAt: true,
        _count: {
          select: {
            debats: true,
            messages: true,
            votes: true,
            abonnes: true,
            abonnements: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return user;
  }

  // Modifier son propre profil
  async modifierProfil(userId: string, dto: ModifierProfilDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: {
        id: true,
        email: true,
        prenom: true,
        nom: true,
        bio: true,
        photoUrl: true,
        ville: true,
        role: true,
      },
    });
  }

  // S'abonner à un utilisateur
  async sabonner(abonneId: string, cibleId: string) {
    if (abonneId === cibleId) {
      throw new Error('Vous ne pouvez pas vous abonner à vous-même');
    }

    const existant = await this.prisma.abonnement.findUnique({
      where: { abonneId_cibleId: { abonneId, cibleId } },
    });

    if (existant) {
      // Déjà abonné → se désabonner
      await this.prisma.abonnement.delete({
        where: { abonneId_cibleId: { abonneId, cibleId } },
      });
      return { message: 'Désabonnement effectué', abonne: false };
    }

    await this.prisma.abonnement.create({
      data: { abonneId, cibleId },
    });

    // Créer une notification pour la cible
    await this.prisma.notification.create({
      data: {
        type: 'NOUVEL_ABONNE',
        titre: 'Nouvel abonné',
        contenu: 'Quelqu\'un s\'est abonné à votre profil',
        userId: cibleId,
      },
    });

    return { message: 'Abonnement effectué', abonne: true };
  }

  // Lister les abonnés d'un utilisateur
  async getAbonnes(userId: string) {
    return this.prisma.abonnement.findMany({
      where: { cibleId: userId },
      include: {
        abonne: {
          select: { id: true, prenom: true, nom: true, photoUrl: true, role: true },
        },
      },
    });
  }
}