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
 * The only border where a domain error becomes an HTTP code.
 *
 * It lives in infrastructure by design: the core throws named errors
 * (`DocumentIngestionFailedError`), not `HttpException`. If tomorrow the same
 * use case is exposed over gRPC or through a queue, another translator gets
 * written and the domain does not change.
 *
 * An `HttpException` (the ones Nest builds: validation, size…) goes straight
 * through.
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
      // 502: the failure belongs to a downstream service, not to the officer's
      // request.
      this.logger.error(exception.message, exception.stack);
      response.status(HttpStatus.BAD_GATEWAY).json({
        statusCode: HttpStatus.BAD_GATEWAY,
        message: exception.message,
        error: 'Bad Gateway',
      });
      return;
    }

    this.logger.error(
      'Unhandled error',
      exception instanceof Error ? exception.stack : String(exception),
    );

    // No details on the way out: what happened is in the log.
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal error',
      error: 'Internal Server Error',
    });
  }
}
