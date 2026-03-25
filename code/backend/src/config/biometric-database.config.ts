import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const BIOMETRIC_DB_CONNECTION = 'biometric';

export const biometricDatabaseConfigFactory = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  const isDev = configService.get<string>('APP_ENV') === 'development';

  return {
    type: 'postgres',
    host: configService.get<string>('BIO_DB_HOST', 'localhost'),
    port: configService.get<number>('BIO_DB_PORT', 5433),
    database: configService.get<string>('BIO_DB_NAME', 'smtts_biometric'),
    username: configService.get<string>('BIO_DB_USER', 'smtts_bio_user'),
    password: configService.get<string>('BIO_DB_PASS', 'smtts_bio_secret_2026'),
    autoLoadEntities: true,
    synchronize: isDev,
    logging: isDev,
    retryAttempts: 5,
    retryDelay: 3000,
  };
};
