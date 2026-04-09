import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreerVoteDto } from './dto/creer-vote.dto';
import { DebatsGateway } from '../websocket/debats.gateway';

@Injectable()
export class VotesService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly gateway: DebatsGateway,
  ) {}

  async voter(votantId: string, dto: CreerVoteDto) {
    if (!dto.messageId && !dto.debatId) {
      throw new BadRequestException('messageId ou debatId est requis');
    }
    if (dto.debatId) return this.voterDebat(votantId, dto.debatId, dto.type);
    return this.voterMessage(votantId, dto.messageId!, dto.type);
  }

  private async voterMessage(votantId: string, messageId: string, type: string) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Message introuvable');

    const existant = await this.prisma.vote.findUnique({
      where: { votantId_messageId: { votantId, messageId } },
    });

    if (existant) {
      if (existant.type === type) {
        await this.prisma.vote.delete({ where: { id: existant.id } });
        return { action: 'annule', messageId };
      }
      return this.prisma.vote.update({ where: { id: existant.id }, data: { type: type as any } });
    }

    return this.prisma.vote.create({ data: { type: type as any, votantId, messageId } });
  }

  private async voterDebat(votantId: string, debatId: string, type: string) {
    const debat = await this.prisma.debat.findUnique({ where: { id: debatId } });
    if (!debat) throw new NotFoundException('Débat introuvable');
    if (debat.statut !== 'OUVERT') throw new BadRequestException('Ce débat ne reçoit plus de votes');

    const existant = await this.prisma.voteDebat.findUnique({
      where: { votantId_debatId: { votantId, debatId } },
    });

    let result: any;
    if (existant) {
      if (existant.type === type) {
        await this.prisma.voteDebat.delete({ where: { id: existant.id } });
        result = { action: 'annule', debatId };
      } else {
        result = await this.prisma.voteDebat.update({
          where: { id: existant.id },
          data: { type: type as any },
        });
      }
    } else {
      result = await this.prisma.voteDebat.create({
        data: { type: type as any, votantId, debatId },
      });
    }

    // Diffuser les nouveaux stats en temps réel
    const stats = await this.votesParDebat(debatId);
    this.gateway?.diffuserVotesDebat(debatId, stats);

    return result;
  }

  async votesParMessage(messageId: string) {
    const [pour, contre] = await Promise.all([
      this.prisma.vote.count({ where: { messageId, type: 'POUR' } }),
      this.prisma.vote.count({ where: { messageId, type: 'CONTRE' } }),
    ]);
    return { messageId, pour, contre, total: pour + contre };
  }

  async votesParDebat(debatId: string) {
    const [pour, contre] = await Promise.all([
      this.prisma.voteDebat.count({ where: { debatId, type: 'POUR' } }),
      this.prisma.voteDebat.count({ where: { debatId, type: 'CONTRE' } }),
    ]);
    const total = pour + contre;
    return {
      debatId,
      pour,
      contre,
      total,
      pourcentagePour:   total > 0 ? Math.round((pour   / total) * 100) : 0,
      pourcentageContre: total > 0 ? Math.round((contre / total) * 100) : 0,
    };
  }

  async monVoteDebat(votantId: string, debatId: string) {
    const vote = await this.prisma.voteDebat.findUnique({
      where: { votantId_debatId: { votantId, debatId } },
    });
    return { debatId, vote: vote?.type ?? null };
  }
}
