import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreerMessageDto } from './dto/creer-message.dto';

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  // Poster un message dans un débat (APPRENANT, FORMATEUR, ADMIN)
  async creer(auteurId: string, dto: CreerMessageDto) {
    // Vérifier que le débat existe et est ouvert
    const debat = await this.prisma.debat.findUnique({
      where: { id: dto.debatId },
    });

    if (!debat) throw new NotFoundException('Débat introuvable');

    if (debat.statut !== 'OUVERT') {
      throw new BadRequestException(
        'Ce débat n\'est pas ouvert aux messages pour le moment',
      );
    }

    return this.prisma.message.create({
      data: {
        contenu: dto.contenu,
        auteurId,
        debatId: dto.debatId,
      },
      include: {
        auteur: {
          select: { id: true, prenom: true, nom: true, role: true },
        },
      },
    });
  }

  // Masquer un message (modération — FORMATEUR ou ADMIN)
  async masquer(id: string, userId: string, userRole: string) {
    const message = await this.prisma.message.findUnique({
      where: { id },
      include: { debat: true },
    });

    if (!message) throw new NotFoundException('Message introuvable');

    // Seul le créateur du débat ou un ADMIN peut masquer
    if (message.debat.createurId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('Vous ne pouvez pas modérer ce message');
    }

    return this.prisma.message.update({
      where: { id },
      data: { visible: false },
    });
  }

  // Supprimer son propre message (ou ADMIN)
  async supprimer(id: string, userId: string, userRole: string) {
    const message = await this.prisma.message.findUnique({ where: { id } });
    if (!message) throw new NotFoundException('Message introuvable');

    if (message.auteurId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('Vous ne pouvez pas supprimer ce message');
    }

    return this.prisma.message.delete({ where: { id } });
  }
}