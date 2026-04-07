import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreerLiveDto } from './dto/creer-live.dto';

@Injectable()
export class LivesService {
  constructor(private readonly prisma: PrismaService) {}

  async creer(createurId: string, dto: CreerLiveDto) {
    return this.prisma.live.create({
      data: {
        ...dto,
        dateDebut: new Date(dto.dateDebut),
        createurId,
      },
      include: {
        createur: { select: { id: true, prenom: true, nom: true } },
      },
    });
  }

  async listerTous() {
    return this.prisma.live.findMany({
      orderBy: { dateDebut: 'desc' },
      include: {
        createur: { select: { id: true, prenom: true, nom: true } },
        _count: { select: { messagesLive: true } },
      },
    });
  }

  async findById(id: string) {
    const live = await this.prisma.live.findUnique({
      where: { id },
      include: {
        createur: { select: { id: true, prenom: true, nom: true } },
        messagesLive: {
          orderBy: { createdAt: 'asc' },
          take: 100,
          include: {
            auteur: { select: { id: true, prenom: true, nom: true } },
          },
        },
      },
    });
    if (!live) throw new NotFoundException('Live introuvable');

    // Incrémenter les vues
    await this.prisma.live.update({
      where: { id },
      data: { vues: { increment: 1 } },
    });

    return live;
  }

  async mettreAJourStatut(id: string, statut: string, replayUrl?: string) {
    return this.prisma.live.update({
      where: { id },
      data: { statut: statut as any, ...(replayUrl ? { replayUrl } : {}) },
    });
  }

  async envoyerMessageChat(auteurId: string, liveId: string, contenu: string) {
    return this.prisma.messageLive.create({
      data: { auteurId, liveId, contenu },
      include: {
        auteur: { select: { id: true, prenom: true, nom: true } },
      },
    });
  }

  async supprimer(id: string) {
    // Supprimer les messages du live d'abord (contrainte FK)
    await this.prisma.messageLive.deleteMany({ where: { liveId: id } });
    return this.prisma.live.delete({ where: { id } });
  }
}