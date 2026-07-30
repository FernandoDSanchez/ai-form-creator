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
 * Inbound adapter. It translates HTTP ↔ domain and nothing else: no business
 * rule lives here.
 *
 * The GETs exist even though the front listens over WebSocket. They are not
 * redundant: the WS brings the changes *from the moment you connected*, and a
 * starting point is needed when opening the screen. They are also the safety
 * net if the socket never manages to connect.
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
    summary: 'Requests the generation of a form',
    description:
      'Synchronous phase: validates the documents, writes the request as ' +
      'PENDING and enqueues the workflow. It answers without waiting for the ' +
      'model — progress arrives over the /form-generations WebSocket.',
  })
  @ApiAcceptedResponse({
    description: 'Request accepted; generation continues in the background.',
    type: FormGenerationResponse,
  })
  @ApiBadRequestResponse({
    description:
      'The prompt does not meet the limits, or some documents do not exist.',
  })
  @ApiBadGatewayResponse({ description: 'The workflow could not be enqueued.' })
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
    summary: 'Lists the requests, from the newest to the oldest',
  })
  @ApiOkResponse({ type: [FormGenerationResponse] })
  async list(): Promise<FormGenerationResponse[]> {
    const formGenerations = await this.listFormGenerations.execute();

    // An arrow and not `.map(FormGenerationResponse.from)`: passing a static
    // method as a callback detaches it from its class, and
    // `@typescript-eslint/unbound-method` flags it even though `from` does not
    // use `this` here.
    return formGenerations.map((formGeneration) =>
      FormGenerationResponse.from(formGeneration),
    );
  }

  @Get(':formGenerationId')
  @ApiOperation({ summary: 'Current status of a request' })
  @ApiOkResponse({ type: FormGenerationResponse })
  @ApiNotFoundResponse({ description: 'That request does not exist.' })
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
    summary: 'Approves or rejects a generated form',
    description:
      'Hands the verdict over to the workflow, which is halted waiting for ' +
      'it. The final status is written by the worker, so the response does ' +
      'not carry it: it arrives over the WebSocket like any other change.',
  })
  @ApiNoContentResponse({ description: 'Verdict delivered.' })
  @ApiNotFoundResponse({ description: 'That request does not exist.' })
  @ApiConflictResponse({
    description: 'The request is not awaiting review.',
  })
  @ApiBadGatewayResponse({ description: 'The verdict could not be delivered.' })
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
