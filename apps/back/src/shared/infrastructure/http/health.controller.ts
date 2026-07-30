import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

/**
 * Liveness/readiness of the Deployment. It stays out of the global prefix
 * (`/api`) because the manifest probes point at plain `/health`.
 *
 * It deliberately does not query Postgres: if the database flickers we do not
 * want Kubernetes restarting the pod in a loop. The connection is already
 * validated at boot (`PrismaService.onModuleInit`).
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
