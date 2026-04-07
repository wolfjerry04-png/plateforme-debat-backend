import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { CreerTournoiDto } from './dto/creer-tournoi.dto';
import { CreerEquipeDto } from './dto/creer-equipe.dto';

@Injectable()
export class TournoisService {
  private anthropic: Anthropic;

  constructor(private readonly prisma: PrismaService, private configService: ConfigService) {
    this.anthropic = new Anthropic({
      apiKey: this.configService.get<string>('anthropic.apiKey'),
    });
  }

  async creer(createurId: string, dto: CreerTournoiDto) {
    return this.prisma.tournoi.create({
      data: {
        ...dto,
        dateDebut: new Date(dto.dateDebut),
        createurId,
      },
      include: {
        createur: { select: { id: true, prenom: true, nom: true } },
      },
    });
  }

  async listerTous() {
    return this.prisma.tournoi.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        createur: { select: { id: true, prenom: true, nom: true } },
        _count: { select: { equipes: true, matchs: true } },
      },
    });
  }

  async findById(id: string) {
    const tournoi = await this.prisma.tournoi.findUnique({
      where: { id },
      include: {
        createur: { select: { id: true, prenom: true, nom: true } },
        equipes: {
          include: {
            capitaine: { select: { id: true, prenom: true, nom: true } },
            membres: {
              include: {
                user: { select: { id: true, prenom: true, nom: true } },
              },
            },
          },
        },
        matchs: {
          orderBy: [{ round: 'asc' }, { dateMatch: 'asc' }],
          include: {
            equipe1: { select: { id: true, nom: true } },
            equipe2: { select: { id: true, nom: true } },
          },
        },
      },
    });

    if (!tournoi) throw new NotFoundException('Tournoi introuvable');
    return tournoi;
  }

  async inscrireEquipe(capitaineId: string, dto: CreerEquipeDto) {
    const tournoi = await this.prisma.tournoi.findUnique({
      where: { id: dto.tournoiId },
      include: { _count: { select: { equipes: true } } },
    });

    if (!tournoi) throw new NotFoundException('Tournoi introuvable');
    if (tournoi.statut !== 'INSCRIPTION') throw new BadRequestException('Les inscriptions sont fermées');
    if (tournoi._count.equipes >= tournoi.maxEquipes) throw new BadRequestException('Le tournoi est complet');

    return this.prisma.equipe.create({
      data: {
        nom: dto.nom,
        tournoiId: dto.tournoiId,
        capitaineId,
        membres: {
          create: [
            { userId: capitaineId },
            ...(dto.membresIds || [])
              .filter((id) => id !== capitaineId)
              .map((userId) => ({ userId })),
          ],
        },
      },
      include: {
        membres: true,
        capitaine: { select: { id: true, prenom: true, nom: true } },
      },
    });
  }

  // 🤖 Générer le calendrier des matchs avec l'IA
  async genererCalendrier(tournoiId: string) {
    const tournoi = await this.findById(tournoiId);

    if (tournoi.statut !== 'INSCRIPTION') throw new BadRequestException('Calendrier déjà généré');

    if (tournoi.equipes.length < 4) {
      throw new BadRequestException('Il faut au moins 4 équipes pour générer un calendrier');
    }

    // Mélanger les équipes aléatoirement pour le tirage
    const equipes = [...tournoi.equipes].sort(() => Math.random() - 0.5);
    const matchsACreer: any[] = [];
    const dateDebut = new Date(tournoi.dateDebut);

    // Générer les matchs du premier round (quarts, ou demi si 4 équipes)
    for (let i = 0; i < equipes.length; i += 2) {
      if (equipes[i + 1]) {
        // 🤖 L'IA génère un sujet unique pour chaque match
        const sujet = await this.tirerSujetIA();
        const dateMatch = new Date(dateDebut);
        dateMatch.setDate(dateDebut.getDate() + Math.floor(i / 2) * 7);

        matchsACreer.push({
          tournoiId,
          equipe1Id: equipes[i].id,
          equipe2Id: equipes[i + 1].id,
          sujet,
          round: 1,
          dateMatch,
          statut: 'PROGRAMME',
        });
      }
    }

    // Créer tous les matchs en base
    await this.prisma.match.createMany({ data: matchsACreer });

    // Passer le tournoi en statut EN_COURS
    await this.prisma.tournoi.update({
      where: { id: tournoiId },
      data: { statut: 'EN_COURS' },
    });

    return this.findById(tournoiId);
  }

  // 🤖 IA — Générer un sujet de débat pertinent pour Haïti
  async tirerSujetIA(): Promise<string> {
    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 150,
        messages: [
          {
            role: 'user',
            content: `Tu es expert en débat juridique et politique en Haïti.
Génère UN sujet de débat percutant, actuel et pertinent pour le contexte haïtien.
Le sujet doit être formulé comme une proposition à défendre (Pour ou Contre).
Format : "La peine de mort devrait être rétablie en Haïti"
Réponds UNIQUEMENT avec le sujet, sans guillemets, sans explication.`,
          },
        ],
      });
      return (message.content[0] as any).text.trim();
    } catch {
      // Fallback si l'IA est indisponible
      const sujets = [
        'L\'éducation gratuite devrait être garantie par l\'État haïtien',
        'La peine de mort devrait être rétablie pour les crimes de guerre en Haïti',
        'Le créole haïtien devrait être la seule langue officielle d\'Haïti',
        'Les élections haïtiennes devraient être supervisées par la communauté internationale',
        'La diaspora haïtienne devrait avoir le droit de vote aux élections nationales',
      ];
      return sujets[Math.floor(Math.random() * sujets.length)];
    }
  }

  // Enregistrer le résultat d'un match et avancer le tournoi
  async enregistrerResultat(matchId: string, scoreEquipe1: number, scoreEquipe2: number) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: { tournoi: true },
    });

    if (!match) throw new NotFoundException('Match introuvable');
    if (match.statut === 'TERMINE') throw new BadRequestException('Ce match est déjà terminé');
    if (scoreEquipe1 === scoreEquipe2) throw new BadRequestException('Il ne peut pas y avoir d\'égalité dans un tournoi de débat');

    const gagnantId = scoreEquipe1 > scoreEquipe2 ? match.equipe1Id : match.equipe2Id;

    // Mettre à jour le match
    await this.prisma.match.update({
      where: { id: matchId },
      data: { scoreEquipe1, scoreEquipe2, gagnantId, statut: 'TERMINE' },
    });

    // Vérifier si tous les matchs du round sont terminés
    const tousMatchsRound = await this.prisma.match.findMany({
      where: { tournoiId: match.tournoiId, round: match.round },
    });

    // On recharge le match mis à jour pour le comptage
    const tousTermines = tousMatchsRound.every(
      (m) => m.id === matchId ? true : m.statut === 'TERMINE'
    );

    if (tousTermines) {
      await this.genererProchainRound(match.tournoiId, match.round);
    }

    return this.findById(match.tournoiId);
  }

  // Générer le prochain round automatiquement avec l'IA
  private async genererProchainRound(tournoiId: string, roundActuel: number) {
    // CORRECTION : on récupère les gagnants depuis les matchs du round actuel
    // en cherchant les equipeId (pas userId) qui ont gagné
    const matchsRound = await this.prisma.match.findMany({
      where: { tournoiId, round: roundActuel, statut: 'TERMINE' },
    });

    // CORRECTION : gagnantId est un equipeId (pas un userId)
    const gagnantEquipeIds = matchsRound
      .map((m) => m.gagnantId)
      .filter(Boolean) as string[];

    // Si un seul gagnant → le tournoi est terminé
    if (gagnantEquipeIds.length <= 1) {
      const gagnantEquipe = gagnantEquipeIds[0]
        ? await this.prisma.equipe.findUnique({
            where: { id: gagnantEquipeIds[0] },
          })
        : null;

      await this.prisma.tournoi.update({
        where: { id: tournoiId },
        data: { statut: 'TERMINE', dateFin: new Date() },
      });

      if (gagnantEquipe) {
        await this.prisma.notification.create({
          data: {
            type: 'MENTION',
            titre: '🏆 Champion du tournoi !',
            contenu: `L'équipe "${gagnantEquipe.nom}" a remporté le tournoi !`,
            userId: gagnantEquipe.capitaineId,
          },
        });
      }
      return;
    }

    // Générer les matchs du prochain round
    const prochainRound = roundActuel + 1;
    const matchsACreer: any[] = [];
    const dateBase = new Date();

    for (let i = 0; i < gagnantEquipeIds.length; i += 2) {
      if (gagnantEquipeIds[i + 1]) {
        const sujet = await this.tirerSujetIA();
        const dateMatch = new Date(dateBase);
        dateMatch.setDate(dateBase.getDate() + 7);

        matchsACreer.push({
          tournoiId,
          equipe1Id: gagnantEquipeIds[i],
          equipe2Id: gagnantEquipeIds[i + 1],
          sujet,
          round: prochainRound,
          dateMatch,
          statut: 'PROGRAMME',
        });
      }
    }

    if (matchsACreer.length > 0) {
      await this.prisma.match.createMany({ data: matchsACreer });
    }
  }
}
