import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { parseTrustProxySetting } from './common/utils/proxy-trust.util';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 3000);
  const host = configService.get<string>('app.host', '0.0.0.0');
  const apiPrefix = configService.get<string>('app.apiPrefix', 'api');
  const apiVersion = configService.get<string>('app.apiVersion', 'v1');

  // Set Global API Route Prefix (e.g. /api/v1)
  app.setGlobalPrefix(`${apiPrefix}/${apiVersion}`);

  // Increase payload limit for large bulk product imports
  const express = require('express');
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Enable helmet for security headers
  const helmet = require('helmet');
  app.use(helmet());

  const isProduction = process.env.NODE_ENV === 'production';

  // Configure Reverse Proxy Trust Policy (Finding 2 / NET-02)
  const { setting: trustProxySetting, warning: proxyWarning } = parseTrustProxySetting(
    process.env.TRUST_PROXY,
    isProduction,
  );
  if (proxyWarning) {
    console.warn(`⚠️ ${proxyWarning}`);
  }
  const expressApp = app.getHttpAdapter().getInstance();
  if (expressApp && typeof expressApp.set === 'function') {
    expressApp.set('trust proxy', trustProxySetting);
  }
  const rawOrigins = process.env.CORS_ORIGIN || process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL;
  const allowedOrigins = rawOrigins
    ? rawOrigins.split(',').map((o) => o.trim()).filter(Boolean)
    : [];

  if (isProduction && allowedOrigins.length === 0) {
    console.warn(
      '⚠️ WARNING: No CORS_ORIGIN or ALLOWED_ORIGINS configured in production. Set CORS_ORIGIN to allow frontend web clients.',
    );
  }

  app.enableCors({
    origin: (requestOrigin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (Electron desktop client, server-to-server, curl, local tools)
      if (!requestOrigin) {
        return callback(null, true);
      }
      if (!isProduction) {
        // Reflect origin dynamically in dev so credentials: true works without wildcard conflict
        return callback(null, true);
      }
      if (allowedOrigins.includes(requestOrigin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS origin '${requestOrigin}' rejected by policy`), false);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Global Enterprise Validation Pipe Configuration
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      forbidUnknownValues: true,
      validationError: {
        target: false,
        value: false,
      },
    }),
  );

  // Global Exception Filter Configuration
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global Interceptors Configuration (Logging & Response Transformation)
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  await app.listen(port, host);
  console.log(
    `🚀 INFEPOS Enterprise Backend is running on http://${host}:${port}/${apiPrefix}/${apiVersion}`,
  );
}

bootstrap();
