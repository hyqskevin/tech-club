import crypto from 'crypto';
import { Injectable, Inject, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { DB_ADAPTER } from '@server/database/database.module';
import type { DbAdapter } from '@server/database/db-adapter';
import type { Member, Post, PostResponse, Reply } from '@server/database/db-types';
import { CreatePostDto, SearchPostsDto, UpdatePostDto } from './dto';

/** 帖子列表扩展接口：包含回复数量 + 已解析的图片数组 */
type PostWithReplyCount = PostResponse & {
  reply_count: number;
};

/**
 * 帖子服务
 * 处理帖子的增删改查、权限验证等业务逻辑
 *
 * 字段命名与 PostgreSQL schema 完全一致：snake_case
 */
@Injectable()
export class PostsService {
  constructor(
    @Inject(DB_ADAPTER) private readonly db: DbAdapter,
  ) {}

  /**
   * 搜索帖子列表
   */
  async search(params: SearchPostsDto): Promise<{ items: PostWithReplyCount[]; nextPageToken: string | undefined; hasMore: boolean }> {
    const { category, searchKey, pageSize = 20 } = params;

    const query: Record<string, unknown> = {};
    if (category) {
      query.category = category;
    }
    if (searchKey) {
      query.title = { $regex: new RegExp(searchKey, 'i') };
    }

    const options = {
      limit: pageSize,
      orderBy: { field: 'last_reply_time', direction: 'desc' as const },
    };

    const items = await this.db.findMany<Post>('posts', query, options);

    const postsWithReplyCount = await Promise.all(
      items.map(async (post) => ({
        ...post,
        reply_count: await this.db.count('replies', { post_id: post.id }),
        images: this.parseImages(post.images),
      }))
    );

    let nextPageToken: string | undefined;
    if (items.length === pageSize) {
      const lastItem = items[items.length - 1];
      const lastStatusOrder = lastItem.status === '讨论中' ? 0 : 1;
      nextPageToken = `${lastStatusOrder}_${lastItem.last_reply_time}_${lastItem.id}`;
    }

    return {
      items: postsWithReplyCount,
      nextPageToken,
      hasMore: !!nextPageToken,
    };
  }

  /**
   * 根据 ID 获取帖子详情
   */
  async getById(id: string): Promise<(PostWithReplyCount) | null> {
    const post = await this.db.findById<Post>('posts', id);
    if (!post) return null;

    const reply_count = await this.db.count('replies', { post_id: id });
    return { ...post, reply_count, images: this.parseImages(post.images) };
  }

  /**
   * 创建帖子
   */
  async create(data: CreatePostDto) {
    if (!data.author_nickname?.trim()) {
      throw new BadRequestException('昵称不能为空');
    }
    if (!data.author_phone?.trim()) {
      throw new BadRequestException('手机号不能为空');
    }

    return this.db.create('posts', {
      id: this.generateId(),
      title: data.title,
      category: data.category,
      content: data.content,
      author_user_id: data.author_user_id,
      author_nickname: data.author_nickname,
      author_phone: data.author_phone,
      status: '讨论中',
      last_reply_time: new Date().toISOString(),
      images: JSON.stringify(data.images ?? []),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  /**
   * 更新帖子
   */
  async update(id: string, data: UpdatePostDto) {
    const { nickname, phone, ...updateFields } = data;

    const post = await this.db.findById<Post>('posts', id);
    if (!post) {
      throw new NotFoundException('帖子不存在');
    }

    // 权限校验：仅作者本人（昵称+手机号同时匹配）或管理员可操作
    const isOwner =
      !!nickname &&
      !!phone &&
      nickname === post.author_nickname &&
      phone === post.author_phone;

    let isAdmin = false;
    if (!isOwner && nickname && phone) {
      const member = await this.db.findOne<Member>('members', { nickname, phone });
      isAdmin = member?.role === 'admin';
    }

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('只能修改自己的帖子');
    }

    // 已结贴的帖子，限制再次修改状态：仅管理员可重新开启，普通作者不可再结贴/重新开启
    if (
      post.status === '已解决' &&
      typeof updateFields.status === 'string' &&
      !isAdmin
    ) {
      throw new ForbiddenException('已结贴的帖子不能再修改状态');
    }

    await this.db.update('posts', id, {
      ...updateFields,
      images: updateFields.images !== undefined ? JSON.stringify(updateFields.images) : undefined,
      updated_at: new Date().toISOString(),
    });
  }

  /**
   * 更新帖子最后回复时间
   */
  async updateLastReplyTime(id: string) {
    await this.db.update('posts', id, {
      last_reply_time: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  /**
   * 删除帖子（含关联回复）
   */
  async delete(id: string, auth: { nickname: string; phone: string }) {
    const post = await this.db.findById<Post>('posts', id);
    if (!post) {
      throw new NotFoundException('帖子不存在');
    }

    // 权限校验：仅作者本人（昵称+手机号同时匹配）或管理员可操作
    const isOwner =
      !!auth.nickname &&
      !!auth.phone &&
      auth.nickname === post.author_nickname &&
      auth.phone === post.author_phone;

    let isAdmin = false;
    if (!isOwner && auth.nickname && auth.phone) {
      const member = await this.db.findOne<Member>('members', { nickname: auth.nickname, phone: auth.phone });
      isAdmin = member?.role === 'admin';
    }

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('只能删除自己的帖子');
    }

    // 已结贴的帖子不允许删除（即便作者本人也不可），仅管理员可强制删除
    if (post.status === '已解决' && !isAdmin) {
      throw new ForbiddenException('已结贴的帖子不允许删除');
    }

    const replies = await this.db.findMany<Reply>('replies', { post_id: id });
    for (const reply of replies) {
      await this.db.delete('replies', reply.id);
    }
    await this.db.delete('posts', id);
  }

  /**
   * 删除所有帖子（管理员批量操作）
   */
  async deleteAll() {
    const posts = await this.db.findMany<Post>('posts', {});
    for (const post of posts) {
      const replies = await this.db.findMany<Reply>('replies', { post_id: post.id });
      for (const reply of replies) {
        await this.db.delete('replies', reply.id);
      }
      await this.db.delete('posts', post.id);
    }
  }

  /**
   * 验证管理员权限
   */
  async verifyAdmin(nickname: string, phone: string): Promise<void> {
    const member = await this.db.findOne<Member>('members', { nickname, phone });

    if (member?.role !== 'admin') {
      throw new ForbiddenException('需要管理员权限');
    }
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return crypto.randomUUID();
  }

  /**
   * 解析存储为 JSON 字符串的图片列表，容错：缺失/格式错误时返回空数组
   */
  private parseImages(imagesJson?: string): string[] {
    if (!imagesJson) return [];
    try {
      const parsed = JSON.parse(imagesJson);
      return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
    } catch {
      return [];
    }
  }
}