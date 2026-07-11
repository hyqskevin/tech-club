import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus, NotFoundException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PostsService } from './posts.service';
import { RepliesService } from '../replies/replies.service';
import { CreatePostDto, SearchPostsDto, UpdatePostDto } from './dto';
import { CreateReplyDto } from '../replies/dto';
import type { AuthVerify } from '@shared/api.interface';

@ApiTags('posts')
@Controller('api/posts')
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly repliesService: RepliesService,
  ) {}

  @Get()
  async search(@Query() query: SearchPostsDto) {
    const pageSize = query.pageSize ? Math.min(Number(query.pageSize), 100) : 20;
    return this.postsService.search({
      ...query,
      pageSize,
    });
  }

  @Post('bulk-delete')
  @HttpCode(HttpStatus.OK)
  async bulkDelete(@Body() body: AuthVerify) {
    await this.postsService.verifyAdmin(body.nickname, body.phone);
    await this.postsService.deleteAll();
    return { success: true };
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    const post = await this.postsService.getById(id);
    if (!post) {
      throw new NotFoundException('帖子不存在');
    }
    return post;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: CreatePostDto) {
    const postId = await this.postsService.create(body);
    return { id: postId };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: UpdatePostDto) {
    await this.postsService.update(id, body);
    return { success: true };
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Body() body: AuthVerify) {
    await this.postsService.delete(id, body);
    return { success: true };
  }

  @Get(':id/replies')
  async getReplies(@Param('id') id: string, @Query() query: { pageSize?: number; pageToken?: string }) {
    const pageSize = query.pageSize ? Math.min(Number(query.pageSize), 100) : 100;
    return this.repliesService.search({
      post_id: id,
      pageSize,
      pageToken: query.pageToken,
    });
  }

  @Post(':id/replies')
  @HttpCode(HttpStatus.CREATED)
  async createReply(@Param('id') id: string, @Body() body: Omit<CreateReplyDto, 'post_id'>) {
    const replyId = await this.repliesService.create({
      ...body,
      post_id: id,
    });
    await this.postsService.updateLastReplyTime(id);
    return { id: replyId };
  }
}