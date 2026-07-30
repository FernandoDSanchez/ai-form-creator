import { Module } from '@nestjs/common';

import { FormGenerationModule } from './form-generation/form-generation.module';
import { RegulatoryDocumentsModule } from './regulatory-documents/regulatory-documents.module';
import { HealthController } from './shared/infrastructure/http/health.controller';
import { PrismaModule } from './shared/infrastructure/prisma/prisma.module';

@Module({
  imports: [PrismaModule, RegulatoryDocumentsModule, FormGenerationModule],
  controllers: [HealthController],
})
export class AppModule {}
