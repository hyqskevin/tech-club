import crypto from 'crypto';
import { Injectable, Inject, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { DB_ADAPTER } from '@server/database/database.module';
import type { DbAdapter } from '@server/database/db-adapter';
import type { Member, Reply, Post } from '@server/database/db-types';
import { CreateReplyDto, SearchRepliesDto, UpdateReplyDto } from './dto';

/**
 * 回复服务
 * 处理回复的增删改查、采纳回复等业务逻辑
 *
 * 字段命名与 PostgreSQL schema 完全一致：snake_case
 */
@Injectable()
export class RepliesService {
  constructor(
    @Inject(DB_ADAPTER) private readonly db: DbAdapter,
  ) {}

  /**
   * 搜索帖子的回复列表
   */
  async search(params: SearchRepliesDto) {
    const { post_id, pageSize = 100 } = params;

    const query: Record<string, unknown> = { post_id };

    const options = {
      limit: pageSize,
      orderBy: { field: 'created_at', direction: 'asc' as const },
    };

    const items = await this.db.findMany<Reply>('replies', query, options);

    let nextPageToken: string | undefined;
    if (items.length === pageSize) {
      const lastItem = items[items.length - 1];
      nextPageToken = `${lastItem.created_at}_${lastItem.id}`;
    }

    return {
      items,
      nextPageToken,
      hasMore: !!nextPageToken,
    };
  }

  /**
   * 根据 ID 获取回复详情
   */
  async getById(id: string) {
    return this.db.findById<Reply>('replies', id);
  }

  /**
   * 创建回复
   */
  async create(data: CreateReplyDto) {
    if (!data.replier_nickname?.trim()) {
      throw new BadRequestException('昵称不能为空');
    }
    if (!data.replier_phone?.trim()) {
      throw new BadRequestException('手机号不能为空');
    }

    return this.db.create('replies', {
      id: this.generateId(),
      post_id: data.post_id,
      content: data.content,
      replier_user_id: data.replier_user_id,
      replier_nickname: data.replier_nickname,
      replier_phone: data.replier_phone,
      is_adopted: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  /**
   * 更新回复
   */
  async update(id: string, data: UpdateReplyDto) {
    const { nickname, phone, is_adopted, ...rest } = data;
    const updateFields: Record<string, unknown> = {
      ...rest,
      updated_at: new Date().toISOString(),
    };
    if (is_adopted !== undefined) {
      // 采纳/取消采纳必须走专用端点 PUT /api/replies/:id/adopt
      // 或 DELETE /api/replies/:id/adopt，通用 update 拒绝改 is_adopted
      // （防止回复者自采纳、或帖子作者绕开专用校验改任意 reply 的采纳位）
      throw new BadRequestException('is_adopted 字段不允许通过 update 接口修改，请使用采纳/取消采纳专用端点');
    }

    const reply = await this.db.findById<Reply>('replies', id);
    if (!reply) {
      throw new NotFoundException('回复不存在');
    }

    // 权限校验：仅回复者本人（昵称+手机号同时匹配）或管理员可操作
    const isOwner =
      !!nickname &&
      !!phone &&
      nickname === reply.replier_nickname &&
      phone === reply.replier_phone;

    let isAdmin = false;
    if (!isOwner && nickname && phone) {
      const member = await this.db.findOne<Member>('members', { nickname, phone });
      isAdmin = member?.role === 'admin';
    }

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('只能修改自己的回复');
    }

    await this.db.update('replies', id, updateFields);
  }

  /**
   * 取消采纳
   * 仅帖子作者或管理员可操作
   */
  async unadopt(id: string, auth: { nickname: string; phone: string }) {
    const reply = await this.db.findById<Reply>('replies', id);
    if (!reply) {
      throw new NotFoundException('回复不存在');
    }
    const post = await this.db.findById<Post>('posts', reply.post_id);
    if (!post) {
      throw new NotFoundException('帖子不存在');
    }

    let isAuthorized = false;
    if (auth.nickname && auth.phone) {
      const member = await this.db.findOne<Member>('members', { nickname: auth.nickname, phone: auth.phone });
      if (member?.role === 'admin') {
        isAuthorized = true;
      }
    }
    if (
      !isAuthorized &&
      auth.nickname && auth.phone &&
      auth.nickname === post.author_nickname &&
      auth.phone === post.author_phone
    ) {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      throw new ForbiddenException('只有帖子作者或管理员可以取消采纳');
    }

    await this.db.update('replies', id, {
      is_adopted: 0,
      updated_at: new Date().toISOString(),
    });

    return { ...reply, is_adopted: 0 };
  }

  /**
   * 删除回复
   */
  async delete(id: string, auth: { nickname: string; phone: string }) {
    const reply = await this.db.findById<Reply>('replies', id);
    if (!reply) {
      throw new NotFoundException('回复不存在');
    }

    // 权限校验：仅回复者本人（昵称+手机号同时匹配）或管理员可操作
    const isOwner =
      !!auth.nickname &&
      !!auth.phone &&
      auth.nickname === reply.replier_nickname &&
      auth.phone === reply.replier_phone;

    let isAdmin = false;
    if (!isOwner && auth.nickname && auth.phone) {
      const member = await this.db.findOne<Member>('members', { nickname: auth.nickname, phone: auth.phone });
      isAdmin = member?.role === 'admin';
    }

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('只能删除自己的回复');
    }

    await this.db.delete('replies', id);
  }

  /**
   * 采纳回复
   */
  async adopt(id: string, auth: { nickname: string; phone: string }) {
    const reply = await this.db.findById<Reply>('replies', id);
    if (!reply) {
      throw new NotFoundException('回复不存在');
    }

    const post = await this.db.findById<Post>('posts', reply.post_id);
    if (!post) {
      throw new NotFoundException('帖子不存在');
    }

    let isAuthorized = false;
    let isAdmin = false;

    if (auth.nickname && auth.phone) {
      const member = await this.db.findOne<Member>('members', { nickname: auth.nickname, phone: auth.phone });
      isAdmin = member?.role === 'admin';
    }

    if (isAdmin) {
      isAuthorized = true;
    } else if (auth.nickname && auth.phone && auth.nickname === post.author_nickname && auth.phone === post.author_phone) {
      if (auth.nickname === reply.replier_nickname && auth.phone === reply.replier_phone) {
        throw new ForbiddenException('不能采纳自己的回复');
      }
      isAuthorized = true;
    }

    if (!isAuthorized) {
      throw new ForbiddenException('只有帖子作者或管理员可以采纳回复');
    }

    const existingAdopted = await this.db.findOne<Reply>('replies', {
      post_id: reply.post_id,
      is_adopted: 1,
    });

    if (existingAdopted && existingAdopted.id !== id) {
      await this.db.update('replies', existingAdopted.id, {
        is_adopted: 0,
        updated_at: new Date().toISOString(),
      });
    }

    await this.db.update('replies', id, {
      is_adopted: 1,
      updated_at: new Date().toISOString(),
    });

    return { ...reply, is_adopted: 1 };
  }

  /**
   * 删除所有回复（管理员批量操作）
   */
  async deleteAll() {
    const replies = await this.db.findMany<Reply>('replies', {});
    for (const reply of replies) {
      await this.db.delete('replies', reply.id);
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
}