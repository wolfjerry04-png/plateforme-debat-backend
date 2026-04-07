import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreerCoursDto } from './dto/creer-cours.dto';

@Injectable()
export class CoursService {
  constructor(private readonly prisma: PrismaService) {}

  // Créer un cours (FORMATEUR ou ADMIN)
  async creer(createurId: string, dto: CreerCoursDto) {
    return this.prisma.cours.create({
      data: { ...dto, createurId },
      include: {
        createur: { select: { id: true, prenom: true, nom: true } },
        _count: { select: { lecons: true } },
      },
    });
  }

  // Lister tous les cours publiés
  async listerTous(niveau?: string) {
    return this.prisma.cours.findMany({
      where: {
        publie: true,
        ...(niveau ? { niveau: niveau as any } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        createur: { select: { id: true, prenom: true, nom: true } },
        _count: { select: { lecons: true, inscriptions: true } },
      },
    });
  }

  // Détail d'un cours avec ses leçons
  async findById(id: string) {
    const cours = await this.prisma.cours.findUnique({
      where: { id },
      include: {
        createur: { select: { id: true, prenom: true, nom: true } },
        lecons: {
          orderBy: { ordre: 'asc' },
          include: { quiz: true },
        },
        _count: { select: { inscriptions: true } },
      },
    });

    if (!cours) throw new NotFoundException('Cours introuvable');
    return cours;
  }

  // Publier ou dépublier un cours
  async togglePublier(id: string, userId: string, userRole: string) {
    const cours = await this.prisma.cours.findUnique({ where: { id } });
    if (!cours) throw new NotFoundException('Cours introuvable');

    if (cours.createurId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('Non autorisé');
    }

    return this.prisma.cours.update({
      where: { id },
      data: { publie: !cours.publie },
    });
  }

  // S'inscrire à un cours
  async sInscrire(userId: string, coursId: string) {
    const cours = await this.prisma.cours.findUnique({ where: { id: coursId } });
    if (!cours) throw new NotFoundException('Cours introuvable');

    const existant = await this.prisma.inscription.findUnique({
      where: { userId_coursId: { userId, coursId } },
    });

    if (existant) return { message: 'Déjà inscrit', inscription: existant };

    return this.prisma.inscription.create({
      data: { userId, coursId },
    });
  }

  // Progression d'un apprenant dans un cours
  async getProgression(userId: string, coursId: string) {
    const cours = await this.findById(coursId);
    const totalLecons = cours.lecons.length;

    const terminees = await this.prisma.progressionLecon.count({
      where: {
        userId,
        leconId: { in: cours.lecons.map((l) => l.id) },
        termine: true,
      },
    });

    return {
      totalLecons,
      terminees,
      pourcentage: totalLecons > 0 ? Math.round((terminees / totalLecons) * 100) : 0,
    };
  }
}