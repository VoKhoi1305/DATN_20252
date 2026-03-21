import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import { EscalationRulesService } from './escalation-rules.service';
import { CreateEscalationRuleDto } from './dto/create-escalation-rule.dto';
import { UpdateEscalationRuleDto } from './dto/update-escalation-rule.dto';
import { ListEscalationRulesDto } from './dto/list-escalation-rules.dto';

@Controller('escalation-rules')
export class EscalationRulesController {
  constructor(
    private readonly escalationRulesService: EscalationRulesService,
  ) {}

  @Get()
  async list(@Query() query: ListEscalationRulesDto) {
    return this.escalationRulesService.list(query);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.escalationRulesService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateEscalationRuleDto) {
    return this.escalationRulesService.create(dto);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEscalationRuleDto,
  ) {
    return this.escalationRulesService.update(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.escalationRulesService.delete(id);
  }

  @Patch(':id/toggle')
  async toggleActive(@Param('id', ParseUUIDPipe) id: string) {
    return this.escalationRulesService.toggleActive(id);
  }
}
