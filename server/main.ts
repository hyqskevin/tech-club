import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import * as express from 'express';

import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
async function bootstrap() {

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    abortOnError: process.env.NODE_ENV !== 'development',
  });

  const logger = new Logger('Bootstrap');
  const host = process.env.SERVER_HOST ?? 'localhost';
  const port = Number(process.env.SERVER_PORT ?? '3000');

  app.enableCors();

  app.use('/assets', express.static(join(process.cwd(), 'client/public')));
  app.use('/uploads', express.static(join(process.cwd(), 'client/public/uploads')));

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      disableErrorMessages: process.env.NODE_ENV === 'production',
    }),
  );

  // Swagger / OpenAPI 文档：开发与生产环境均启用，便于随时查阅 API
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Tech Club API')
    .setDescription('内部技术社区后端 API 文档（帖子、回复、成员、活动）')
    .setVersion('1.0.0')
    .addTag('posts', '帖子相关接口')
    .addTag('replies', '回复相关接口')
    .addTag('members', '成员相关接口')
    .addTag('activities', '活动相关接口')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(port, host);
  logger.log(`Server running on ${host}:${port}`);
  logger.log(`API endpoints ready at http://${host}:${port}/api`);
  logger.log(`Swagger docs available at http://${host}:${port}/api/docs`);
}

void bootstrap();
