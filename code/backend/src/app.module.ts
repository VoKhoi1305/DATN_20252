import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { SubjectsModule } from './modules/subjects/subjects.module';
import { ScenariosModule } from './modules/scenarios/scenarios.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { GeofencesModule } from './modules/geofences/geofences.module';
import { EventsModule } from './modules/events/events.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { CasesModule } from './modules/cases/cases.module';
import { SeedModule } from './modules/seed/seed.module';
import { databaseConfigFactory } from './config/database.config';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: databaseConfigFactory,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ([
        {
          ttl: configService.get<number>('THROTTLE_TTL', 900000),
          limit: configService.get<number>('THROTTLE_LIMIT', 5),
        },
      ]),
    }),
    AuthModule,
    UsersModule,
    SubjectsModule,
    ScenariosModule,
    DashboardModule,
    GeofencesModule,
    EventsModule,
    AlertsModule,
    CasesModule,
    SeedModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
