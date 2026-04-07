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

  // Créer un nouveau débat (FORMATEUR ou ADMIN seulement)
  async creer(createurId: string, dto: CreerDebatDto) {
    return this.prisma.debat.create({
      data: {
        titre: dto.titre,
        description: dto.description,
        statut: dto.statut ?? 'BROUILLON',
        createurId,
      },
      include: {
        createur: {
          select: { id: true, prenom: true, nom: true, role: true },
        },
      },
    });
  }

  // Lister tous les débats (avec pagination)
  async listerTous(page: number = 1, limite: number = 10) {
    const skip = (page - 1) * limite;

    const [debats, total] = await Promise.all([
      this.prisma.debat.findMany({
        skip,
        take: limite,
        orderBy: { createdAt: 'desc' },
        include: {
          createur: {
            select: { id: true, prenom: true, nom: true },
          },
          _count: {
            select: { messages: true }, // nombre de messages par débat
          },
        },
      }),
      this.prisma.debat.count(),
    ]);

    return {
      debats,
      total,
      page,
      totalPages: Math.ceil(total / limite),
    };
  }

  // Récupérer un débat avec tous ses messages
  async findById(id: string) {
    const debat = await this.prisma.debat.findUnique({
      where: { id },
      include: {
        createur: {
          select: { id: true, prenom: true, nom: true, role: true },
        },
        messages: {
          where: { visible: true }, // exclut les messages masqués
          orderBy: { createdAt: 'asc' },
          include: {
            auteur: {
              select: { id: true, prenom: true, nom: true, role: true },
            },
            votes: true,
            _count: { select: { votes: true } },
          },
        },
      },
    });

    if (!debat) throw new NotFoundException('Débat introuvable');
    return debat;
  }

  // Modifier un débat (créateur ou ADMIN)
  async modifier(id: string, userId: string, userRole: string, dto: ModifierDebatDto) {
    const debat = await this.prisma.debat.findUnique({ where: { id } });
    if (!debat) throw new NotFoundException('Débat introuvable');

    // Seul le créateur ou un ADMIN peut modifier
    if (debat.createurId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('Vous ne pouvez pas modifier ce débat');
    }

    return this.prisma.debat.update({
      where: { id },
      data: dto,
    });
  }

  // Supprimer un débat (ADMIN seulement)
  async supprimer(id: string) {
    const debat = await this.prisma.debat.findUnique({ where: { id } });
    if (!debat) throw new NotFoundException('Débat introuvable');

    return this.prisma.debat.delete({ where: { id } });
  }
}