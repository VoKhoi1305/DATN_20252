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
import { databaseConfigFactory } from './config/database.config';
import { biometricDatabaseConfigFactory } from './config/biometric-database.config';
import { EnrollmentModule } from './modules/enrollment/enrollment.module';
import { CheckinModule } from './modules/checkin/checkin.module';
import { DevicesModule } from './modules/devices/devices.module';
import { RequestsModule } from './modules/requests/requests.module';
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
    TypeOrmModule.forRootAsync({
      name: 'biometric',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: biometricDatabaseConfigFactory,
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
    EnrollmentModule,
    CheckinModule,
    DevicesModule,
    RequestsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
