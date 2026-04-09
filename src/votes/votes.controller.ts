import { Controller, Post, Get, Body, Param, Request, UseGuards } from '@nestjs/common';
import { VotesService } from './votes.service';
import { CreerVoteDto } from './dto/creer-vote.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('votes')
export class VotesController {
  constructor(private readonly votesService: VotesService) {}

  // POST /api/votes — vote sur message ou débat
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'FORMATEUR', 'APPRENANT')
  @Post()
  async voter(@Request() req: any, @Body() dto: CreerVoteDto) {
    return this.votesService.voter(req.user.id, dto);
  }

  // GET /api/votes/message/:id — stats votes d'un message
  @UseGuards(JwtAuthGuard)
  @Get('message/:id')
  async votesParMessage(@Param('id') id: string) {
    return this.votesService.votesParMessage(id);
  }

  // GET /api/votes/debat/:id — stats Pour/Contre d'un débat
  @Get('debat/:id')
  async votesParDebat(@Param('id') id: string) {
    return this.votesService.votesParDebat(id);
  }

  // GET /api/votes/debat/:id/mon-vote — vote perso de l'utilisateur
  @UseGuards(JwtAuthGuard)
  @Get('debat/:id/mon-vote')
  async monVoteDebat(@Param('id') id: string, @Request() req: any) {
    return this.votesService.monVoteDebat(req.user.id, id);
  }
}
