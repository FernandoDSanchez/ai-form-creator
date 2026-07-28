import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

import { DocumentIngestionFailedError } from '../../domain/errors/document-ingestion-failed.error';

/**
 * Única frontera donde un error de dominio se convierte en código HTTP.
 *
 * Vive en infraestructura por diseño: el núcleo lanza errores con nombre
 * (`DocumentIngestionFailedError`), no `HttpException`. Si mañana el mismo caso
 * de uso se expone por gRPC o por una cola, se escribe otro traductor y el
 * dominio no cambia.
 *
 * Un `HttpException` (los que arma Nest: validación, tamaño…) pasa de largo.
 */
@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      response.status(exception.getStatus()).json(exception.getResponse());
      return;
    }

    if (exception instanceof DocumentIngestionFailedError) {
      // 502: el fallo es de un servicio aguas abajo, no del request del oficial.
      this.logger.error(exception.message, exception.stack);
      response.status(HttpStatus.BAD_GATEWAY).json({
        statusCode: HttpStatus.BAD_GATEWAY,
        message: exception.message,
        error: 'Bad Gateway',
      });
      return;
    }

    this.logger.error(
      'Error no contemplado',
      exception instanceof Error ? exception.stack : String(exception),
    );

    // Sin detalles hacia afuera: lo que pasó está en el log.
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Error interno',
      error: 'Internal Server Error',
    });
  }
}
