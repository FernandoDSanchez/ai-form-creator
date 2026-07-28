import { Global, Module } from '@nestjs/common';

import { PrismaService } from './prisma.service';

/**
 * Global porque la conexión es una sola para todo el proceso; cada módulo que
 * necesite persistencia inyecta `PrismaService` sin reimportar nada.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
