import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreerLeconDto } from './dto/creer-lecon.dto';

@Injectable()
export class LeconsService {
  constructor(private readonly prisma: PrismaService) {}

  async creer(dto: CreerLeconDto) {
    return this.prisma.lecon.create({
      data: dto,
    });
  }

  async findById(id: string) {
    const lecon = await this.prisma.lecon.findUnique({
      where: { id },
      include: { quiz: true, cours: true },
    });
    if (!lecon) throw new NotFoundException('Leçon introuvable');
    return lecon;
  }

  // Marquer une leçon comme terminée
  async marquerTerminee(userId: string, leconId: string) {
    return this.prisma.progressionLecon.upsert({
      where: { userId_leconId: { userId, leconId } },
      update: { termine: true },
      create: { userId, leconId, termine: true },
    });
  }
}