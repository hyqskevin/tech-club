import crypto from 'crypto';
import { Injectable, Inject, ForbiddenException } from '@nestjs/common';
import { DB_ADAPTER } from '@server/database/database.module';
import type { DbAdapter } from '@server/database/db-adapter';
import type { Activity, Member } from '@server/database/db-types';
import { CreateActivityDto, UpdateActivityDto } from './dto';

/**
 * 活动服务
 * 处理活动的增删改查、权限验证等业务逻辑
 *
 * 字段命名与 PostgreSQL schema 完全一致：snake_case
 */
@Injectable()
export class ActivitiesService {
  constructor(@Inject(DB_ADAPTER) private readonly db: DbAdapter) {}

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
   * 获取所有活动列表（按创建时间降序）
   */
  async findAll() {
    return this.db.findMany<Activity>('activities', {}, {
      orderBy: { field: 'created_at', direction: 'desc' as const },
    });
  }

  /**
   * 获取最新的活跃活动
   * 业务定义：is_active=1 即为「已发布/启用」状态，应在首页顶部展示；
   * 并不强制要求 start_time <= now（活动可能预先发布还未开始）。
   * 仅当 end_time 早于当前时间（已结束）才视为无效。
   */
  async findLatestActive() {
    const now = new Date().toISOString();
    const query: Record<string, unknown> = {
      is_active: 1,
      end_time: { $gte: now },
    };

    const activities = await this.db.findMany<Activity>('activities', query, {
      orderBy: { field: 'start_time', direction: 'desc' as const },
      limit: 1,
    });

    return activities[0] ?? null;
  }

  /**
   * 根据 ID 获取活动详情
   */
  async findOne(id: string) {
    return this.db.findById<Activity>('activities', id);
  }

  /**
   * 创建活动
   */
  async create(dto: CreateActivityDto) {
    const activity = {
      id: this.generateId(),
      title: dto.title,
      content: dto.content,
      start_time: dto.start_time instanceof Date ? dto.start_time.toISOString() : String(dto.start_time),
      end_time: dto.end_time instanceof Date ? dto.end_time.toISOString() : String(dto.end_time),
      link: dto.link,
      cover_image: dto.cover_image ? String(dto.cover_image) : undefined,
      cover_images: typeof dto.cover_images === 'string' ? dto.cover_images : JSON.stringify(dto.cover_images ?? []),
      is_active: dto.is_active ? 1 : 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await this.db.create('activities', activity);
    return activity;
  }

  /**
   * 更新活动（部分字段更新）
   * 仅写入调用方实际传入的字段，避免 toggle 状态时清空其他列
   */
  async update(id: string, dto: UpdateActivityDto) {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.content !== undefined) updateData.content = dto.content;
    if (dto.start_time !== undefined) {
      updateData.start_time = dto.start_time instanceof Date
        ? dto.start_time.toISOString()
        : String(dto.start_time);
    }
    if (dto.end_time !== undefined) {
      updateData.end_time = dto.end_time instanceof Date
        ? dto.end_time.toISOString()
        : String(dto.end_time);
    }
    if (dto.link !== undefined) updateData.link = dto.link;
    if (dto.cover_image !== undefined) {
        updateData.cover_image = dto.cover_image ? String(dto.cover_image) : null;
      }
    if (dto.cover_images !== undefined) {
      updateData.cover_images = typeof dto.cover_images === 'string'
        ? dto.cover_images
        : JSON.stringify(dto.cover_images ?? []);
    }
    if (dto.is_active !== undefined) updateData.is_active = dto.is_active ? 1 : 0;

    await this.db.update('activities', id, updateData);
    return this.db.findById<Activity>('activities', id);
  }

  /**
   * 删除活动
   */
  async delete(id: string) {
    const activity = await this.db.findById<Activity>('activities', id);
    if (!activity) return false;

    await this.db.delete('activities', id);
    return true;
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return crypto.randomUUID();
  }
}