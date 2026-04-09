import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { IaService } from './ia.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  IsString, IsArray, IsNumber, IsOptional, MinLength, MaxLength,
} from 'class-validator';

class AnalyserArgumentDto {
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  argument: string;

  @IsString()
  titreDebat: string;

  @IsOptional()
  @IsString()
  categorie?: string;

  @IsOptional()
  @IsArray()
  derniersArguments?: string[];
}

class GenererQuizDto {
  @IsString()
  sujet: string;

  @IsOptional()
  @IsNumber()
  nombreQuestions?: number;
}

class GenererLeconDto {
  @IsString()
  sujet: string;

  @IsString()
  niveau: string;
}

class ChatbotDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  message: string;
}

@Controller('ia')
export class IaController {
  constructor(private readonly iaService: IaService) {}

  // POST /api/ia/analyser-argument — clé IA sécurisée côté serveur
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'FORMATEUR', 'APPRENANT')
  @Post('analyser-argument')
  async analyserArgument(@Body() dto: AnalyserArgumentDto) {
    const feedback = await this.iaService.analyserArgument(dto.argument, {
      titreDebat:        dto.titreDebat,
      categorie:         dto.categorie,
      derniersArguments: dto.derniersArguments,
    });
    return feedback;
  }

  // POST /api/ia/generer-quiz
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'FORMATEUR')
  @Post('generer-quiz')
  async genererQuiz(@Body() dto: GenererQuizDto) {
    const questions = await this.iaService.genererQuiz(dto.sujet, dto.nombreQuestions);
    return { questions };
  }

  // POST /api/ia/generer-lecon
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'FORMATEUR')
  @Post('generer-lecon')
  async genererLecon(@Body() dto: GenererLeconDto) {
    const contenu = await this.iaService.genererContenuLecon(dto.sujet, dto.niveau);
    return { contenu };
  }

  // POST /api/ia/chatbot — accessible à tous les connectés
  @UseGuards(JwtAuthGuard)
  @Post('chatbot')
  async chatbot(@Body() dto: ChatbotDto) {
    const reponse = await this.iaService.chatbot(dto.message);
    return { reponse };
  }
}
