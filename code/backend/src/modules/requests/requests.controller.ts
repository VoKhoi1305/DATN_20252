import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestsService } from './requests.service';

@Controller('requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  /**
   * GET /api/v1/requests/all?status=&search=&page=1&limit=20
   * List all requests for officers.
   */
  @Get('all')
  async listAll(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.requestsService.listAll({
      status,
      search,
      page: parseInt(page || '1', 10),
      limit: parseInt(limit || '20', 10),
    });
  }

  /**
   * GET /api/v1/requests?subject_id=...&page=1&limit=20
   * List requests for a subject.
   */
  @Get()
  async list(
    @Query('subject_id') subjectId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.requestsService.listBySubject(
      subjectId,
      parseInt(page || '1', 10),
      parseInt(limit || '20', 10),
    );
  }

  /**
   * POST /api/v1/requests
   * Create a new request from a subject.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser('userId') userId: string,
    @Body() body: { type: string; reason: string; details?: Record<string, any> },
  ) {
    return this.requestsService.create(userId, body);
  }

  /**
   * POST /api/v1/requests/:id/review
   * Approve or reject a request.
   */
  @Post(':id/review')
  @HttpCode(HttpStatus.OK)
  async review(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() body: { action: 'APPROVED' | 'REJECTED'; note?: string },
  ) {
    return this.requestsService.review(id, userId, body.action, body.note);
  }

  /**
   * GET /api/v1/requests/:id
   * Get a single request.
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.requestsService.findOne(id);
  }
}
