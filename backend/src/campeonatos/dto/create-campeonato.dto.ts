import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
  Max,
  IsArray,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum CampeonatoType {
  ALL_VS_ALL = 'ALL_VS_ALL',
  ALL_VS_ALL_RETURN = 'ALL_VS_ALL_RETURN',
  KNOCKOUT = 'KNOCKOUT',
  DOUBLE_ELIMINATION = 'DOUBLE_ELIMINATION',
  GROUP_STAGE = 'GROUP_STAGE',
  LEAGUE_PLAYOFFS = 'LEAGUE_PLAYOFFS',
  CUSTOM = 'CUSTOM',
}

export enum CampeonatoSport {
  FOOTBALL = 'FOOTBALL',
  FUTSAL = 'FUTSAL',
  BASKETBALL = 'BASKETBALL',
  VOLLEYBALL = 'VOLLEYBALL',
  HANDBALL = 'HANDBALL',
  RUGBY = 'RUGBY',
  OTHER = 'OTHER',
}

export class CreateCategoryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  minAge?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Max(120)
  maxAge?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gender?: string;
}

export class CreateSeasonDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsDateString()
  startDate: string;

  @ApiProperty()
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateCampeonatoDto {
  @ApiProperty({ example: 'Copa de Verano 2025' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Torneo de fútbol amateur' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: CampeonatoType })
  @IsEnum(CampeonatoType)
  @IsNotEmpty()
  type: CampeonatoType;

  @ApiProperty({ enum: CampeonatoSport })
  @IsEnum(CampeonatoSport)
  @IsNotEmpty()
  sport: CampeonatoSport;

  @ApiProperty()
  @IsDateString()
  startDate: string;

  @ApiProperty()
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  registrationEndDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(2)
  minTeams?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(2)
  maxTeams?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  pointsPerWin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  pointsPerDraw?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  pointsPerLoss?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  tiebreakerRules?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  regulations?: string;

  @ApiPropertyOptional({ type: [CreateCategoryDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCategoryDto)
  categories?: CreateCategoryDto[];

  @ApiPropertyOptional({ type: [CreateSeasonDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSeasonDto)
  seasons?: CreateSeasonDto[];
}
