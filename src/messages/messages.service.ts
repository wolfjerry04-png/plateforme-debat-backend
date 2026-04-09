import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreerMessageDto } from './dto/creer-message.dto';
import { DebatsGateway } from '../websocket/debats.gateway';

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly gateway: DebatsGateway,
  ) {}

  async creer(auteurId: string, dto: CreerMessageDto) {
    const debat = await this.prisma.debat.findUnique({ where: { id: dto.debatId } });
    if (!debat) throw new NotFoundException('Débat introuvable');
    if (debat.statut !== 'OUVERT') {
      throw new BadRequestException("Ce débat n'est pas ouvert aux messages");
    }

    const message = await this.prisma.message.create({
      data: {
        contenu:  dto.contenu,
        stance:   dto.stance ?? 'NEUTRE',
        auteurId,
        debatId:  dto.debatId,
      },
      include: {
        auteur: { select: { id: true, prenom: true, nom: true, role: true } },
      },
    });

    // Diffusion temps réel
    this.gateway?.diffuserNouveauMessage(dto.debatId, message);

    return message;
  }

  async masquer(id: string, userId: string, userRole: string) {
    const message = await this.prisma.message.findUnique({
      where: { id },
      include: { debat: true },
    });
    if (!message) throw new NotFoundException('Message introuvable');
    if (message.debat.createurId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('Vous ne pouvez pas modérer ce message');
    }
    return this.prisma.message.update({ where: { id }, data: { visible: false } });
  }

  async supprimer(id: string, userId: string, userRole: string) {
    const message = await this.prisma.message.findUnique({ where: { id } });
    if (!message) throw new NotFoundException('Message introuvable');
    if (message.auteurId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('Vous ne pouvez pas supprimer ce message');
    }
    return this.prisma.message.delete({ where: { id } });
  }
}
