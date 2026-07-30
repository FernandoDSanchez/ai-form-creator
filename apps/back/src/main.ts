import 'reflect-metadata';

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { appConfig, swaggerConfig } from './config/app-config';
import { env } from './config/env';

const HEALTH_ROUTE = 'health';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // `/health` stays out of the prefix: the Deployment probes expect it at the
  // root.
  app.setGlobalPrefix(appConfig.globalPrefix, { exclude: [HEALTH_ROUTE] });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // The front runs on another origin (app.<host> vs api.<host>).
  app.enableCors();

  // Closes connections (Prisma included) on SIGTERM from Kubernetes.
  app.enableShutdownHooks();

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle(swaggerConfig.title)
      .setDescription(swaggerConfig.description)
      .setVersion(swaggerConfig.version)
      .build(),
  );
  SwaggerModule.setup(swaggerConfig.path, app, document);

  await app.listen(env.PORT, '0.0.0.0');

  const logger = new Logger(appConfig.name);
  logger.log(`Listening on :${env.PORT}`);
  logger.log(`Swagger at /${swaggerConfig.path}`);
}

void bootstrap();
