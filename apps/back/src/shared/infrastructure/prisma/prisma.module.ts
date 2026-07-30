import { Global, Module } from '@nestjs/common';

import { PrismaService } from './prisma.service';

/**
 * Global because the connection is a single one for the whole process; every
 * module needing persistence injects `PrismaService` without re-importing
 * anything.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
