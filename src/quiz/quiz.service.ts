import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreerQuizDto } from './dto/creer-quiz.dto';
import { SoumettreQuizDto } from './dto/soumettre-quiz.dto';

@Injectable()
export class QuizService {
  constructor(private readonly prisma: PrismaService) {}

  async creer(dto: CreerQuizDto) {
    return this.prisma.quiz.create({
      data: {
        leconId: dto.leconId,
        questions: dto.questions,
      },
    });
  }

  // Soumettre les réponses et calculer le score
  async soumettre(userId: string, dto: SoumettreQuizDto) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: dto.quizId },
    });
    if (!quiz) throw new NotFoundException('Quiz introuvable');

    const questions = quiz.questions as any[];
    let bonnesReponses = 0;

    // Calculer le score
    questions.forEach((q, index) => {
      if (dto.reponses[index] === q.reponse) {
        bonnesReponses++;
      }
    });

    const score = Math.round((bonnesReponses / questions.length) * 100);

    // Sauvegarder le résultat
    const resultat = await this.prisma.resultatQuiz.create({
      data: {
        userId,
        quizId: dto.quizId,
        score,
        reponses: dto.reponses,
      },
    });

    return {
      score,
      bonnesReponses,
      totalQuestions: questions.length,
      reussi: score >= 70, // 70% pour réussir
      resultat,
    };
  }

  // Historique des résultats d'un utilisateur
  async getMesResultats(userId: string) {
    return this.prisma.resultatQuiz.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        quiz: {
          include: {
            lecon: { select: { titre: true, coursId: true } },
          },
        },
      },
    });
  }
}