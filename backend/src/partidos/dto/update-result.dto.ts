import { IsInt, Min, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum MatchStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  FINALIZED = 'FINALIZED',
  POSTPONED = 'POSTPONED',
  CANCELLED = 'CANCELLED',
}

export class UpdateResultDto {
  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(0)
  homeScore: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(0)
  awayScore: number;

  @ApiPropertyOptional({ enum: MatchStatus })
  @IsOptional()
  @IsEnum(MatchStatus)
  status?: MatchStatus;
}
