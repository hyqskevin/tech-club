import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus, NotFoundException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MembersService } from './members.service';
import { CreateMemberDto, SearchMembersDto } from './dto';

@ApiTags('members')
@Controller('api/members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  async search(@Query() query: SearchMembersDto) {
    return this.membersService.search(query);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    const member = await this.membersService.getById(id);
    if (!member) {
      throw new NotFoundException('成员不存在');
    }
    return member;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: CreateMemberDto) {
    const memberId = await this.membersService.create(body);
    return { id: memberId };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: Partial<CreateMemberDto>) {
    await this.membersService.update(id, body);
    return { success: true };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.membersService.delete(id);
    return { success: true };
  }

  @Post('upsert')
  @HttpCode(HttpStatus.OK)
  async upsert(@Body() body: CreateMemberDto) {
    const memberId = await this.membersService.upsert(body);
    return { id: memberId };
  }
}