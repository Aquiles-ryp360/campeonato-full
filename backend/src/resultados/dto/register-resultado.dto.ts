import { IsInt, Min, IsUUID, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterResultadoDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  partidoId: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(0)
  homeScore: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(0)
  awayScore: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  registeredById?: string;
}
