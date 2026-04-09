import { IsString, MinLength, MaxLength, IsEnum, IsOptional, IsDateString } from 'class-validator';

enum StatutDebat { BROUILLON='BROUILLON', OUVERT='OUVERT', FERME='FERME', ARCHIVE='ARCHIVE' }

export class ModifierDebatDto {
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  titre?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  description?: string;

  @IsOptional()
  @IsEnum(StatutDebat)
  statut?: StatutDebat;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  categorie?: string;

  @IsOptional()
  @IsDateString()
  dateDebut?: string;
}
