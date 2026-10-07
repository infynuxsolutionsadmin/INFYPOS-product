import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

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

  // Enable CORS securely for production
  app.enableCors({
    origin: process.env.NODE_ENV === 'production' 
      ? [configService.get<string>('app.frontendUrl', '')] 
      : '*',
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
