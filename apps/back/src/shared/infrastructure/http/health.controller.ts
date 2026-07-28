import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

/**
 * Liveness/readiness del Deployment. Queda fuera del prefijo global (`/api`)
 * porque las probes del manifiesto apuntan a `/health` a secas.
 *
 * A propósito no consulta Postgres: si la base parpadea no queremos que
 * Kubernetes reinicie el pod en loop. La conexión ya se valida al arrancar
 * (`PrismaService.onModuleInit`).
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Liveness/readiness probe' })
  check(): { status: string } {
    return { status: 'ok' };
  }
}
