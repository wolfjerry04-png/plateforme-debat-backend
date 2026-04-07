import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreerVoteDto } from './dto/creer-vote.dto';

@Injectable()
export class VotesService {
  constructor(private readonly prisma: PrismaService) {}

  // Voter sur un message (APPRENANT, FORMATEUR, ADMIN)
  async voter(votantId: string, dto: CreerVoteDto) {
    // Vérifier que le message existe
    const message = await this.prisma.message.findUnique({
      where: { id: dto.messageId },
    });
    if (!message) throw new NotFoundException('Message introuvable');

    // Vérifier si l'utilisateur a déjà voté sur ce message
    const voteExistant = await this.prisma.vote.findUnique({
      where: {
        votantId_messageId: {
          votantId,
          messageId: dto.messageId,
        },
      },
    });

    if (voteExistant) {
      // Si même type de vote → annuler le vote
      if (voteExistant.type === dto.type) {
        await this.prisma.vote.delete({ where: { id: voteExistant.id } });
        return { message: 'Vote annulé' };
      }

      // Si type différent → changer le vote
      return this.prisma.vote.update({
        where: { id: voteExistant.id },
        data: { type: dto.type },
      });
    }

    // Créer le vote
    return this.prisma.vote.create({
      data: {
        type: dto.type,
        votantId,
        messageId: dto.messageId,
      },
    });
  }

  // Récupérer les votes d'un message avec le décompte
  async votesParMessage(messageId: string) {
    const [pour, contre] = await Promise.all([
      this.prisma.vote.count({
        where: { messageId, type: 'POUR' },
      }),
      this.prisma.vote.count({
        where: { messageId, type: 'CONTRE' },
      }),
    ]);

    return { messageId, pour, contre, total: pour + contre };
  }
}