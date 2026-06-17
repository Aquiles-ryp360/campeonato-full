import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEnum,
  IsInt,
  Min,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SanctionType {
  YELLOW_CARD = 'YELLOW_CARD',
  RED_CARD = 'RED_CARD',
  SUSPENSION = 'SUSPENSION',
  FINE = 'FINE',
  DISQUALIFICATION = 'DISQUALIFICATION',
  OTHER = 'OTHER',
}

export enum SanctionSeverity {
  LIGHT = 'LIGHT',
  MODERATE = 'MODERATE',
  SEVERE = 'SEVERE',
}

export class CreateSanctionDto {
  @ApiProperty({ enum: SanctionType })
  @IsEnum(SanctionType)
  @IsNotEmpty()
  type: SanctionType;

  @ApiProperty({ enum: SanctionSeverity })
  @IsEnum(SanctionSeverity)
  @IsNotEmpty()
  severity: SanctionSeverity;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  issuedDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  matchSuspensionCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  suspensionEndDate?: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  jugadorId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  partidoId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  createdByUserId?: string;
}
