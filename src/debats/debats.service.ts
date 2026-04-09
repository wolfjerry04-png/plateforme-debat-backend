import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreerDebatDto } from './dto/creer-debat.dto';
import { ModifierDebatDto } from './dto/modifier-debat.dto';

@Injectable()
export class DebatsService {
  constructor(private readonly prisma: PrismaService) {}

  async creer(createurId: string, dto: CreerDebatDto) {
    return this.prisma.debat.create({
      data: {
        titre:       dto.titre,
        description: dto.description,
        statut:      dto.statut ?? 'BROUILLON',
        categorie:   dto.categorie,
        dateDebut:   dto.dateDebut ? new Date(dto.dateDebut) : undefined,
        createurId,
      },
      include: {
        createur: { select: { id: true, prenom: true, nom: true, role: true } },
      },
    });
  }

  async listerTous(page = 1, limite = 10) {
    const skip = (page - 1) * limite;

    const [debats, total] = await Promise.all([
      this.prisma.debat.findMany({
        skip,
        take: limite,
        orderBy: { createdAt: 'desc' },
        include: {
          createur: { select: { id: true, prenom: true, nom: true } },
          _count: { select: { messages: true, votesDebat: true } },
        },
      }),
      this.prisma.debat.count(),
    ]);

    // Enrichir chaque débat avec les stats Pour/Contre
    const debatsAvecVotes = await Promise.all(
      debats.map(async (d) => {
        const [pour, contre] = await Promise.all([
          this.prisma.voteDebat.count({ where: { debatId: d.id, type: 'POUR' } }),
          this.prisma.voteDebat.count({ where: { debatId: d.id, type: 'CONTRE' } }),
        ]);
        const totalVotes = pour + contre;
        return {
          ...d,
          votes: {
            pour,
            contre,
            total: totalVotes,
            pourcentagePour:   totalVotes > 0 ? Math.round((pour   / totalVotes) * 100) : 0,
            pourcentageContre: totalVotes > 0 ? Math.round((contre / totalVotes) * 100) : 0,
          },
        };
      }),
    );

    return {
      debats: debatsAvecVotes,
      total,
      page,
      totalPages: Math.ceil(total / limite),
    };
  }

  async findById(id: string) {
    const debat = await this.prisma.debat.findUnique({
      where: { id },
      include: {
        createur: { select: { id: true, prenom: true, nom: true, role: true } },
        messages: {
          where: { visible: true },
          orderBy: { createdAt: 'asc' },
          include: {
            auteur: { select: { id: true, prenom: true, nom: true, role: true } },
            votes: true,
            _count: { select: { votes: true } },
          },
        },
        _count: { select: { messages: true, votesDebat: true } },
      },
    });

    if (!debat) throw new NotFoundException('Débat introuvable');

    // Stats vote global du débat
    const [pour, contre] = await Promise.all([
      this.prisma.voteDebat.count({ where: { debatId: id, type: 'POUR' } }),
      this.prisma.voteDebat.count({ where: { debatId: id, type: 'CONTRE' } }),
    ]);
    const totalVotes = pour + contre;

    return {
      ...debat,
      votes: {
        pour,
        contre,
        total: totalVotes,
        pourcentagePour:   totalVotes > 0 ? Math.round((pour   / totalVotes) * 100) : 0,
        pourcentageContre: totalVotes > 0 ? Math.round((contre / totalVotes) * 100) : 0,
      },
    };
  }

  async modifier(id: string, userId: string, userRole: string, dto: ModifierDebatDto) {
    const debat = await this.prisma.debat.findUnique({ where: { id } });
    if (!debat) throw new NotFoundException('Débat introuvable');

    if (debat.createurId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('Vous ne pouvez pas modifier ce débat');
    }

    return this.prisma.debat.update({
      where: { id },
      data: {
        ...dto,
        dateDebut: dto.dateDebut ? new Date(dto.dateDebut) : undefined,
      },
    });
  }

  async supprimer(id: string) {
    const debat = await this.prisma.debat.findUnique({ where: { id } });
    if (!debat) throw new NotFoundException('Débat introuvable');
    return this.prisma.debat.delete({ where: { id } });
  }

  // Incrémenter les vues
  async incrementerVues(id: string) {
    return this.prisma.debat.update({
      where: { id },
      data: { vues: { increment: 1 } },
    });
  }
}
