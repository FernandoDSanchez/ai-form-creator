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
 * Translates the errors of **this** context into HTTP codes.
 *
 * It looks a lot like the one in `regulatory-documents/`, and that is fine:
 * every bounded context translates its own vocabulary of errors. A shared
 * translator in `shared/` is not possible without breaking the dependency rule
 * — `shared/` cannot import from a context (`CLAUDE.md` §9) — and it would also
 * be a growing list of somebody else's errors in a file that belongs to nobody.
 * The ten lines of the fallback get repeated, and in exchange every context
 * stays deletable in one go.
 *
 * The mapping is a `Record` (`CLAUDE.md` §5): adding a domain error is adding a
 * row, and there is no `if` chain that grows.
 */
const httpStatusByErrorName: Record<string, HttpStatus> = {
  [FormGenerationNotFoundError.name]: HttpStatus.NOT_FOUND,
  // 400: made-up ids are a client error.
  [UnknownRegulatoryDocumentError.name]: HttpStatus.BAD_REQUEST,
  // 409: the request is valid, but it clashes with the current state of the
  // resource.
  [FormGenerationNotReviewableError.name]: HttpStatus.CONFLICT,
  // 502: the one that failed is an outside service (Temporal), not the request.
  [FormGenerationOrchestrationFailedError.name]: HttpStatus.BAD_GATEWAY,
};

@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    // The ones Nest builds (DTO validation, route 404) go straight through.
    if (exception instanceof HttpException) {
      response.status(exception.getStatus()).json(exception.getResponse());
      return;
    }

    const status =
      exception instanceof Error
        ? httpStatusByErrorName[exception.name]
        : undefined;

    if (status && exception instanceof Error) {
      // 5xx are logged with a stack; 4xx belong to the client and would dirty
      // the log without contributing anything.
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
