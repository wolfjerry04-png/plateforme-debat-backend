import { IsEnum, IsUUID, IsOptional } from 'class-validator';

export enum TypeVote {
  POUR = 'POUR',
  CONTRE = 'CONTRE',
}

export class CreerVoteDto {
  @IsEnum(TypeVote, { message: 'Type de vote invalide : POUR ou CONTRE' })
  type: TypeVote;

  // Vote sur un message (argument)
  @IsOptional()
  @IsUUID('4', { message: 'ID de message invalide' })
  messageId?: string;

  // Vote sur un débat (Pour/Contre global)
  @IsOptional()
  @IsUUID('4', { message: 'ID de débat invalide' })
  debatId?: string;
}
