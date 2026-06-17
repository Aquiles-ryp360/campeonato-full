import { IsUUID, IsNotEmpty, IsOptional, IsEnum, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum CarnetType {
  PLAYER = 'PLAYER',
  DELEGATE = 'DELEGATE',
}

export class GenerateCarnetDto {
  @ApiProperty({ enum: CarnetType })
  @IsEnum(CarnetType)
  @IsNotEmpty()
  type: CarnetType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  jugadorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  equipoId?: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  campeonatoId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ example: '2025-12-31' })
  @IsOptional()
  @IsString()
  expiryDate?: string;
}
