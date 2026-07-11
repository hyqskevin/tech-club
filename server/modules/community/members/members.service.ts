import crypto from 'crypto';
import { Injectable, Inject, ForbiddenException } from '@nestjs/common';
import { DB_ADAPTER } from '@server/database/database.module';
import type { DbAdapter } from '@server/database/db-adapter';
import type { Member } from '@server/database/db-types';
import { CreateMemberDto, SearchMembersDto } from './dto';

/**
 * 成员服务
 * 处理成员的增删改查、权限验证等业务逻辑
 *
 * 字段命名与 PostgreSQL schema 完全一致：snake_case
 */
@Injectable()
export class MembersService {
  constructor(
    @Inject(DB_ADAPTER) private readonly db: DbAdapter,
  ) {}

  /**
   * 搜索成员列表
   * @param query 搜索参数（user_id、昵称、手机号）
   */
  async search(query: SearchMembersDto): Promise<Member[]> {
    const searchQuery: Record<string, unknown> = {};
    if (query.user_id) {
      searchQuery.user_id = query.user_id;
    }
    if (query.nickname) {
      searchQuery.nickname = query.nickname;
    }
    if (query.phone) {
      searchQuery.phone = query.phone;
    }
    return this.db.findMany<Member>('members', searchQuery);
  }

  /**
   * 获取所有成员列表
   */
  async findAll(): Promise<Member[]> {
    return this.db.findMany<Member>('members', {});
  }

  /**
   * 根据昵称查找成员
   */
  async findOne(nickname: string): Promise<Member | null> {
    return this.db.findOne<Member>('members', { nickname });
  }

  /**
   * 根据 ID 查找成员
   */
  async findById(id: string): Promise<Member | null> {
    return this.db.findById<Member>('members', id);
  }

  /**
   * 根据 ID 获取成员详情（别名方法）
   */
  async getById(id: string): Promise<Member | null> {
    return this.db.findById<Member>('members', id);
  }

  /**
   * 创建成员
   */
  async create(dto: CreateMemberDto): Promise<string> {
    const member = {
      id: this.generateId(),
      user_id: dto.user_id,
      nickname: dto.nickname,
      phone: dto.phone,
      avatar: '',
      role: dto.role ?? 'member',
      department: '',
      join_time: new Date().toISOString(),
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return this.db.create('members', member);
  }

  /**
   * 创建或更新成员（根据手机号判断）
   */
  async upsert(dto: CreateMemberDto): Promise<string> {
    const existingMember = await this.db.findOne<Member>('members', { phone: dto.phone });
    if (existingMember) {
      await this.db.update('members', existingMember.id, {
        nickname: dto.nickname,
        user_id: dto.user_id,
        role: dto.role ?? existingMember.role,
        updated_at: new Date().toISOString(),
      });
      return existingMember.id;
    }
    return this.create(dto);
  }

  /**
   * 更新成员信息
   */
  async update(id: string, dto: Partial<CreateMemberDto>): Promise<void> {
    await this.db.update('members', id, {
      ...dto,
      updated_at: new Date().toISOString(),
    });
  }

  /**
   * 删除成员
   */
  async delete(id: string): Promise<void> {
    await this.db.delete('members', id);
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