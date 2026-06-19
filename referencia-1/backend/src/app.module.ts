import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CampeonatosModule } from './campeonatos/campeonatos.module';
import { EquiposModule } from './equipos/equipos.module';
import { JugadoresModule } from './jugadores/jugadores.module';
import { DelegadosModule } from './delegados/delegados.module';
import { PartidosModule } from './partidos/partidos.module';
import { FixtureModule } from './fixture/fixture.module';
import { CanchasModule } from './canchas/canchas.module';
import { ResultadosModule } from './resultados/resultados.module';
import { SancionesModule } from './sanciones/sanciones.module';
import { CarnetsModule } from './carnets/carnets.module';
import { ReportesModule } from './reportes/reportes.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../.env',
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CampeonatosModule,
    EquiposModule,
    JugadoresModule,
    DelegadosModule,
    PartidosModule,
    FixtureModule,
    CanchasModule,
    ResultadosModule,
    SancionesModule,
    CarnetsModule,
    ReportesModule,
    DashboardModule,
  ],
})
export class AppModule {}
