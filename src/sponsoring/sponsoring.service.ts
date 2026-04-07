import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SponsoringService {
  constructor(private readonly prisma: PrismaService) {}

  async creerSponsor(data: {
    nom: string;
    logoUrl: string;
    siteWeb?: string;
    description?: string;
    typeContrat: string | any;
    montant: number;
    dateDebut: string;
    dateFin: string;
  }) {
    return this.prisma.sponsor.create({
      data: {
        ...data,
        typeContrat: data.typeContrat as any,
        dateDebut: new Date(data.dateDebut),
        dateFin: new Date(data.dateFin),
      },
    });
  }

  async getSponsorsActifs() {
    const maintenant = new Date();
    return this.prisma.sponsor.findMany({
      where: {
        actif: true,
        dateDebut: { lte: maintenant },
        dateFin: { gte: maintenant },
      },
      orderBy: { montant: 'desc' },
    });
  }

  async getSponsorsTournoi(tournoiId: string) {
    return this.prisma.sponsorTournoi.findMany({
      where: { tournoiId },
      include: { sponsor: true },
    });
  }

  async associerSponsorTournoi(sponsorId: string, tournoiId: string) {
    return this.prisma.sponsorTournoi.create({
      data: { sponsorId, tournoiId },
      include: { sponsor: true },
    });
  }

  async listerTous() {
    return this.prisma.sponsor.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async modifierSponsor(id: string, data: any) {
    return this.prisma.sponsor.update({
      where: { id },
      data: {
        ...data,
        typeContrat: data.typeContrat as any,
        dateDebut: data.dateDebut ? new Date(data.dateDebut) : undefined,
        dateFin: data.dateFin ? new Date(data.dateFin) : undefined,
      },
    });
  }

  async supprimerSponsor(id: string) {
    await this.prisma.sponsorTournoi.deleteMany({ where: { sponsorId: id } });
    return this.prisma.sponsor.delete({ where: { id } });
  }
}
