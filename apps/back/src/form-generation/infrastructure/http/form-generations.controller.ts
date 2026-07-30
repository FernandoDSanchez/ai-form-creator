import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseFilters,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { GetFormGenerationUseCase } from '../../application/get-form-generation.use-case';
import { ListFormGenerationsUseCase } from '../../application/list-form-generations.use-case';
import { RequestFormGenerationUseCase } from '../../application/request-form-generation.use-case';
import { ReviewFormGenerationUseCase } from '../../application/review-form-generation.use-case';

import { DomainExceptionFilter } from './domain-exception.filter';
import { FormGenerationResponse } from './dto/form-generation.response';
import { RequestFormGenerationDto } from './dto/request-form-generation.dto';
import { ReviewFormGenerationDto } from './dto/review-form-generation.dto';

/**
 * Adaptador de entrada. Traduce HTTP ↔ dominio y nada más: ninguna regla de
 * negocio vive acá.
 *
 * Los GET existen aunque el front escuche por WebSocket. No son redundantes:
 * el WS trae los cambios *desde que te conectaste*, y hace falta un punto de
 * partida al abrir la pantalla. Además son la red de seguridad si el socket no
 * llega a conectar.
 */
@ApiTags('form-generations')
@Controller('form-generations')
@UseFilters(DomainExceptionFilter)
export class FormGenerationsController {
  constructor(
    private readonly requestFormGeneration: RequestFormGenerationUseCase,
    private readonly getFormGeneration: GetFormGenerationUseCase,
    private readonly listFormGenerations: ListFormGenerationsUseCase,
    private readonly reviewFormGeneration: ReviewFormGenerationUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Pide la generación de un formulario',
    description:
      'Fase síncrona: valida los documentos, escribe la solicitud en PENDING ' +
      'y encola el workflow. Responde sin esperar al modelo — el avance llega ' +
      'por el WebSocket de /form-generations.',
  })
  @ApiAcceptedResponse({
    description: 'Solicitud aceptada; la generación sigue en segundo plano.',
    type: FormGenerationResponse,
  })
  @ApiBadRequestResponse({
    description:
      'El prompt no cumple los límites o hay documentos que no existen.',
  })
  @ApiBadGatewayResponse({ description: 'No se pudo encolar el workflow.' })
  async request(
    @Body() body: RequestFormGenerationDto,
  ): Promise<FormGenerationResponse> {
    const formGeneration = await this.requestFormGeneration.execute({
      prompt: body.prompt,
      regulatoryDocumentIds: body.regulatoryDocumentIds,
    });

    return FormGenerationResponse.from(formGeneration);
  }

  @Get()
  @ApiOperation({
    summary: 'Lista las solicitudes, de la más nueva a la más vieja',
  })
  @ApiOkResponse({ type: [FormGenerationResponse] })
  async list(): Promise<FormGenerationResponse[]> {
    const formGenerations = await this.listFormGenerations.execute();

    // Arrow y no `.map(FormGenerationResponse.from)`: pasar un método estático
    // como callback lo desprende de su clase, y `@typescript-eslint/unbound-method`
    // lo marca aunque acá `from` no use `this`.
    return formGenerations.map((formGeneration) =>
      FormGenerationResponse.from(formGeneration),
    );
  }

  @Get(':formGenerationId')
  @ApiOperation({ summary: 'Estado actual de una solicitud' })
  @ApiOkResponse({ type: FormGenerationResponse })
  @ApiNotFoundResponse({ description: 'No existe esa solicitud.' })
  async detail(
    @Param('formGenerationId', ParseUUIDPipe) formGenerationId: string,
  ): Promise<FormGenerationResponse> {
    const formGeneration =
      await this.getFormGeneration.execute(formGenerationId);

    return FormGenerationResponse.from(formGeneration);
  }

  @Post(':formGenerationId/review')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Aprueba o rechaza un formulario generado',
    description:
      'Le acerca el veredicto al workflow, que está detenido esperándolo. El ' +
      'estado final lo escribe el worker, así que la respuesta no lo trae: ' +
      'llega por el WebSocket como cualquier otro cambio.',
  })
  @ApiNoContentResponse({ description: 'Veredicto entregado.' })
  @ApiNotFoundResponse({ description: 'No existe esa solicitud.' })
  @ApiConflictResponse({
    description: 'La solicitud no está esperando revisión.',
  })
  @ApiBadGatewayResponse({ description: 'No se pudo entregar el veredicto.' })
  async review(
    @Param('formGenerationId', ParseUUIDPipe) formGenerationId: string,
    @Body() body: ReviewFormGenerationDto,
  ): Promise<void> {
    await this.reviewFormGeneration.execute(formGenerationId, {
      decision: body.decision,
      reviewerNote: body.reviewerNote,
    });
  }
}
