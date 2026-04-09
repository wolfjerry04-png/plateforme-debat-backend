import { IsString, IsUUID, MinLength, MaxLength, IsEnum, IsOptional } from 'class-validator';

export enum StanceMsg {
  POUR = 'POUR',
  CONTRE = 'CONTRE',
  NEUTRE = 'NEUTRE',
}

export class CreerMessageDto {
  @IsString()
  @MinLength(2, { message: 'Le message doit contenir au moins 2 caractères' })
  @MaxLength(2000)
  contenu: string;

  @IsUUID('4', { message: 'ID de débat invalide' })
  debatId: string;

  @IsOptional()
  @IsEnum(StanceMsg, { message: 'Stance invalide : POUR, CONTRE ou NEUTRE' })
  stance?: StanceMsg;
}
