import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';

import { FormGenerationNotFoundError } from '../../domain/errors/form-generation-not-found.error';
import { FormGenerationNotReviewableError } from '../../domain/errors/form-generation-not-reviewable.error';
import { FormGenerationOrchestrationFailedError } from '../../domain/errors/form-generation-orchestration-failed.error';
import { UnknownRegulatoryDocumentError } from '../../domain/errors/unknown-regulatory-document.error';

/**
 * Traduce los errores de **este** contexto a códigos HTTP.
 *
 * Se parece bastante al de `regulatory-documents/` y eso está bien: cada
 * contexto acotado traduce su propio vocabulario de errores. Un traductor
 * compartido en `shared/` no es posible sin romper la regla de dependencias
 * —`shared/` no puede importar de un contexto (`CLAUDE.md` §9)— y además sería
 * una lista creciente de errores ajenos en un archivo que no es de nadie. Se
 * repiten las diez líneas del fallback y se gana que cada contexto sea
 * borrable de un tirón.
 *
 * El mapeo es un `Record` (`CLAUDE.md` §5): agregar un error de dominio es
 * agregar una fila, y no hay cadena de `if` que crezca.
 */
const httpStatusByErrorName: Record<string, HttpStatus> = {
  [FormGenerationNotFoundError.name]: HttpStatus.NOT_FOUND,
  // 400: ids inventados son un error del cliente.
  [UnknownRegulatoryDocumentError.name]: HttpStatus.BAD_REQUEST,
  // 409: el pedido es válido, pero choca con el estado actual del recurso.
  [FormGenerationNotReviewableError.name]: HttpStatus.CONFLICT,
  // 502: el que falló es un servicio de afuera (Temporal), no el request.
  [FormGenerationOrchestrationFailedError.name]: HttpStatus.BAD_GATEWAY,
};

@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    // Los que arma Nest (validación del DTO, 404 de ruta) pasan de largo.
    if (exception instanceof HttpException) {
      response.status(exception.getStatus()).json(exception.getResponse());
      return;
    }

    const status =
      exception instanceof Error
        ? httpStatusByErrorName[exception.name]
        : undefined;

    if (status && exception instanceof Error) {
      // Los 5xx se loguean con stack; los 4xx son del cliente y ensuciarían el
      // log sin aportar nada.
      if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
        this.logger.error(exception.message, exception.stack);
      }

      response.status(status).json({
        statusCode: status,
        message: exception.message,
        error: HttpStatus[status],
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
