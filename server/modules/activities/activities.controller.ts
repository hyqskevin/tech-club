import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto, UpdateActivityDto } from './dto';
import type { AuthVerify } from '@shared/api.interface';

@ApiTags('activities')
@Controller('api/activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get('latest')
  async getLatestActivity() {
    const activity = await this.activitiesService.findLatestActive();
    if (!activity) {
      throw new NotFoundException('暂无活动');
    }
    return activity;
  }

  @Get()
  async getAllActivities() {
    return this.activitiesService.findAll();
  }

  @Get(':id')
  async getActivityById(@Param('id') id: string) {
    const activity = await this.activitiesService.findOne(id);
    if (!activity) {
      throw new NotFoundException('活动不存在');
    }
    return activity;
  }

  @Post()
  async createActivity(@Body() dto: CreateActivityDto) {
    await this.activitiesService.verifyAdmin(dto.nickname, dto.phone);
    return this.activitiesService.create(dto);
  }

  @Put(':id')
  async updateActivity(
    @Param('id') id: string,
    @Body() dto: UpdateActivityDto
  ) {
    await this.activitiesService.verifyAdmin(dto.nickname, dto.phone);
    const activity = await this.activitiesService.findOne(id);
    if (!activity) {
      throw new NotFoundException('活动不存在');
    }
    return this.activitiesService.update(id, dto);
  }

  @Delete(':id')
  async deleteActivity(@Param('id') id: string, @Body() body: AuthVerify) {
    await this.activitiesService.verifyAdmin(body.nickname, body.phone);
    const activity = await this.activitiesService.findOne(id);
    if (!activity) {
      throw new NotFoundException('活动不存在');
    }
    const success = await this.activitiesService.delete(id);
    return { success };
  }
}