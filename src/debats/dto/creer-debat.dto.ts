import { IsString, MinLength, MaxLength, IsEnum, IsOptional, IsDateString } from 'class-validator';

enum StatutDebat { BROUILLON='BROUILLON', OUVERT='OUVERT', FERME='FERME', ARCHIVE='ARCHIVE' }

export class CreerDebatDto {
  @IsString()
  @MinLength(5, { message: 'Le titre doit contenir au moins 5 caractères' })
  @MaxLength(200)
  titre: string;

  @IsString()
  @MinLength(10, { message: 'La description doit contenir au moins 10 caractères' })
  description: string;

  @IsOptional()
  @IsEnum(StatutDebat, { message: 'Statut invalide' })
  statut?: StatutDebat;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  categorie?: string;

  @IsOptional()
  @IsDateString()
  dateDebut?: string;
}
