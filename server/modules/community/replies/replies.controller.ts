import { Controller, Get, Post, Put, Delete, Body, Param, HttpCode, HttpStatus, NotFoundException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RepliesService } from './replies.service';
import { UpdateReplyDto } from './dto';
import type { AuthVerify } from '@shared/api.interface';

@ApiTags('replies')
@Controller('api/replies')
export class RepliesController {
  constructor(private readonly repliesService: RepliesService) {}

  @Post('bulk-delete')
  @HttpCode(HttpStatus.OK)
  async bulkDelete(@Body() body: AuthVerify) {
    await this.repliesService.verifyAdmin(body.nickname, body.phone);
    await this.repliesService.deleteAll();
    return { success: true };
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    const reply = await this.repliesService.getById(id);
    if (!reply) {
      throw new NotFoundException('回复不存在');
    }
    return reply;
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: UpdateReplyDto) {
    await this.repliesService.update(id, body);
    return { success: true };
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Body() body: AuthVerify) {
    await this.repliesService.delete(id, body);
    return { success: true };
  }

  @Put(':id/adopt')
  async adopt(@Param('id') id: string, @Body() body: AuthVerify) {
    const result = await this.repliesService.adopt(id, body);
    return { success: true, data: result };
  }

  @Delete(':id/adopt')
  async unadopt(@Param('id') id: string, @Body() body: AuthVerify) {
    const result = await this.repliesService.unadopt(id, body);
    return { success: true, data: result };
  }
}