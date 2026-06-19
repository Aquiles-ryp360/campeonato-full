import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePartidoDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  fixtureId: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  round: number;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  homeTeamId: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  awayTeamId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  canchaId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  refereeId?: string;

  @ApiProperty()
  @IsDateString()
  scheduledDate: string;

  @ApiPropertyOptional({ example: '16:00' })
  @IsOptional()
  @IsString()
  scheduledTime?: string;
}
