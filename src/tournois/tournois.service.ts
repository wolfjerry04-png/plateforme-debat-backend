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

  // Créer un tournoi
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

  // Lister tous les tournois
  async listerTous() {
    return this.prisma.tournoi.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        createur: { select: { id: true, prenom: true, nom: true } },
        _count: { select: { equipes: true, matchs: true } },
      },
    });
  }

  // Détail d'un tournoi
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
            equipe1: true,
            equipe2: true,
          },
        },
      },
    });

    if (!tournoi) throw new NotFoundException('Tournoi introuvable');
    return tournoi;
  }

  // Inscrire une équipe
  async inscrireEquipe(capitaineId: string, dto: CreerEquipeDto) {
    const tournoi = await this.prisma.tournoi.findUnique({
      where: { id: dto.tournoiId },
      include: { _count: { select: { equipes: true } } },
    });

    if (!tournoi) throw new NotFoundException('Tournoi introuvable');

    if (tournoi.statut !== 'INSCRIPTION') {
      throw new BadRequestException('Les inscriptions sont fermées');
    }

    if (tournoi._count.equipes >= tournoi.maxEquipes) {
      throw new BadRequestException('Le tournoi est complet');
    }

    const equipe = await this.prisma.equipe.create({
      data: {
        nom: dto.nom,
        tournoiId: dto.tournoiId,
        capitaineId,
        membres: {
          create: [
            { userId: capitaineId },
            ...dto.membresIds
              .filter((id) => id !== capitaineId)
              .map((userId) => ({ userId })),
          ],
        },
      },
      include: { membres: true },
    });

    return equipe;
  }

  // 🤖 GÉNÉRATION IA — Calendrier des matchs
  async genererCalendrier(tournoiId: string) {
    const tournoi = await this.findById(tournoiId);

    if (tournoi.equipes.length < 4) {
      throw new BadRequestException('Il faut au moins 4 équipes pour générer un calendrier');
    }

    // Mélanger les équipes aléatoirement
    const equipes = [...tournoi.equipes].sort(() => Math.random() - 0.5);
    const matchsACreer = [];
    const dateDebut = new Date(tournoi.dateDebut);

    // Générer les quarts de finale (round 1)
    for (let i = 0; i < equipes.length; i += 2) {
      if (equipes[i + 1]) {
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
        });
      }
    }

    // Créer tous les matchs
    await this.prisma.match.createMany({ data: matchsACreer });

    // Passer le tournoi en statut EN_COURS
    await this.prisma.tournoi.update({
      where: { id: tournoiId },
      data: { statut: 'EN_COURS' },
    });

    return this.findById(tournoiId);
  }

  // 🤖 IA — Tirer un sujet de débat aléatoire
  async tirerSujetIA(): Promise<string> {
    const message = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: `Tu es expert en débat juridique haïtien.
          Génère UN sujet de débat percutant et pertinent pour le contexte haïtien actuel.
          Le sujet doit être formulé comme une proposition (Pour ou Contre).
          Exemples de format : "La peine de mort devrait être rétablie en Haïti"
          Réponds UNIQUEMENT avec le sujet, sans explication, sans guillemets.`,
        },
      ],
    });

    return (message.content[0] as any).text.trim();
  }

  // Enregistrer le résultat d'un match
  async enregistrerResultat(
    matchId: string,
    scoreEquipe1: number,
    scoreEquipe2: number,
  ) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: { tournoi: { include: { matchs: true } } },
    });

    if (!match) throw new NotFoundException('Match introuvable');

    const gagnantId =
      scoreEquipe1 > scoreEquipe2 ? match.equipe1Id : match.equipe2Id;

    // Mettre à jour le match
    await this.prisma.match.update({
      where: { id: matchId },
      data: {
        scoreEquipe1,
        scoreEquipe2,
        gagnantId,
        statut: 'TERMINE',
      },
    });

    // Vérifier si tous les matchs du round sont terminés
    const matchsRound = match.tournoi.matchs.filter(
      (m) => m.round === match.round,
    );
    const tousTermines = matchsRound.every(
      (m) => m.id === matchId || m.statut === 'TERMINE',
    );

    if (tousTermines) {
      await this.genererProchainRound(match.tournoiId, match.round);
    }

    return this.findById(match.tournoiId);
  }

  // Générer le prochain round automatiquement
  private async genererProchainRound(tournoiId: string, roundActuel: number) {
    const matchsRound = await this.prisma.match.findMany({
      where: { tournoiId, round: roundActuel, statut: 'TERMINE' },
    });

    const gagnants = matchsRound
      .map((m) => m.gagnantId)
      .filter(Boolean) as string[];

    // Si un seul gagnant → tournoi terminé
    if (gagnants.length === 1) {
      await this.prisma.tournoi.update({
        where: { id: tournoiId },
        data: { statut: 'TERMINE', dateFin: new Date() },
      });

      // Attribuer le badge Champion au capitaine de l'équipe gagnante
      const equipeGagnante = await this.prisma.equipe.findUnique({
        where: { id: gagnants[0] },
      });

      if (equipeGagnante) {
        // Badge et points pour le capitaine
        await this.prisma.notification.create({
          data: {
            type: 'MENTION',
            titre: '🏆 Champion du tournoi !',
            contenu: 'Votre équipe a remporté le tournoi. Félicitations !',
            userId: equipeGagnante.capitaineId,
          },
        });
      }
      return;
    }

    // Générer les matchs du prochain round
    const prochainRound = roundActuel + 1;
    const matchsACreer = [];
    const tournoi = await this.prisma.tournoi.findUnique({
      where: { id: tournoiId },
    });
    const dateBase = new Date();

    for (let i = 0; i < gagnants.length; i += 2) {
      if (gagnants[i + 1]) {
        const sujet = await this.tirerSujetIA();
        const dateMatch = new Date(dateBase);
        dateMatch.setDate(dateBase.getDate() + 7);

        matchsACreer.push({
          tournoiId,
          equipe1Id: gagnants[i],
          equipe2Id: gagnants[i + 1],
          sujet,
          round: prochainRound,
          dateMatch,
        });
      }
    }

    await this.prisma.match.createMany({ data: matchsACreer });
  }
}