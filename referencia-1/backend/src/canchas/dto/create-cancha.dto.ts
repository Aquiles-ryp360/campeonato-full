import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCanchaDto {
  @ApiProperty({ example: 'Estadio Nacional' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Av. Grecia 2001, Ñuñoa' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ example: 5000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({ example: { lunes: '09:00-18:00', martes: '09:00-18:00' } })
  @IsOptional()
  @IsObject()
  schedule?: Record<string, string>;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  campeonatoId: string;
}
