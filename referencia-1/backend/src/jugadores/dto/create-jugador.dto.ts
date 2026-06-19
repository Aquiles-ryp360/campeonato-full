import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DocumentType {
  DNI = 'DNI',
  RUT = 'RUT',
  PASSPORT = 'PASSPORT',
  OTHER = 'OTHER',
}

export enum PlayerPosition {
  GOALKEEPER = 'GOALKEEPER',
  DEFENDER = 'DEFENDER',
  MIDFIELDER = 'MIDFIELDER',
  FORWARD = 'FORWARD',
  OTHER = 'OTHER',
}

export enum PlayerStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  INJURED = 'INJURED',
  INACTIVE = 'INACTIVE',
}

export class CreateJugadorDto {
  @ApiProperty({ example: 'Carlos' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'González' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ enum: DocumentType })
  @IsEnum(DocumentType)
  @IsNotEmpty()
  documentType: DocumentType;

  @ApiProperty({ example: '12345678-9' })
  @IsString()
  @IsNotEmpty()
  documentNumber: string;

  @ApiProperty({ example: '1995-06-15' })
  @IsDateString()
  @IsNotEmpty()
  birthDate: string;

  @ApiPropertyOptional({ example: 'https://example.com/photo.jpg' })
  @IsOptional()
  @IsString()
  photo?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  jerseyNumber?: number;

  @ApiPropertyOptional({ enum: PlayerPosition })
  @IsOptional()
  @IsEnum(PlayerPosition)
  position?: PlayerPosition;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  equipoId: string;

  @ApiPropertyOptional({ enum: PlayerStatus })
  @IsOptional()
  @IsEnum(PlayerStatus)
  status?: PlayerStatus;
}
