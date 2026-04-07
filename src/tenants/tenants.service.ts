import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async creer(data: {
    nom: string;
    slug: string;
    description?: string;
    pays?: string;
    langue?: string;
  }) {
    return this.prisma.tenant.create({ data });
  }

  async findBySlug(slug: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) throw new NotFoundException('Organisation introuvable');
    return tenant;
  }

  async listerTous() {
    return this.prisma.tenant.findMany({
      where: { actif: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async mettreAJour(id: string, data: any) {
    return this.prisma.tenant.update({ where: { id }, data });
  }
}
