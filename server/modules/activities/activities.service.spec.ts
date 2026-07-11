import { ForbiddenException } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { createMockDbAdapter, buildMember, buildActivity } from '../../../test/unit/helpers/mock-db-adapter';

describe('ActivitiesService', () => {
  let service: ActivitiesService;
  let db: ReturnType<typeof createMockDbAdapter>;
  let stores: ReturnType<typeof createMockDbAdapter>['stores'];

  beforeEach(() => {
    db = createMockDbAdapter();
    stores = db.stores;
    service = new ActivitiesService(db.adapter);
  });

  describe('verifyAdmin', () => {
    it('场景：admin 角色，应不抛错', async () => {
      stores.members.set('m1', buildMember({ id: 'm1', role: 'admin' }));

      await expect(service.verifyAdmin('张三', '13800138000')).resolves.toBeUndefined();
    });

    it('场景：非 admin 角色，应抛 ForbiddenException', async () => {
      stores.members.set('m1', buildMember({ id: 'm1', role: 'user' }));

      await expect(service.verifyAdmin('张三', '13800138000')).rejects.toThrow(ForbiddenException);
    });

    it('场景：成员不存在，应抛 ForbiddenException', async () => {
      await expect(service.verifyAdmin('不存在', '000')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findAll', () => {
    it('场景：应返回所有活动（按 created_at 倒序）', async () => {
      stores.activities.set('a1', buildActivity({ id: 'a1', title: 'A1', created_at: '2024-01-01T00:00:00Z' }));
      stores.activities.set('a2', buildActivity({ id: 'a2', title: 'A2', created_at: '2024-02-01T00:00:00Z' }));

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('a2');
    });
  });

  describe('findLatestActive', () => {
    it('场景：有进行中的活动，应返回最新一条', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
      stores.activities.set('a1', buildActivity({ id: 'a1', start_time: oneHourAgo, end_time: oneHourLater, is_active: 1 }));
      stores.activities.set('a2', buildActivity({ id: 'a2', start_time: oneHourAgo, end_time: oneHourLater, is_active: 1, created_at: '2024-02-01T00:00:00Z' }));

      const result = await service.findLatestActive();

      expect(result).not.toBeNull();
    });

    it('场景：无活动，应返回 null', async () => {
      const result = await service.findLatestActive();

      expect(result).toBeNull();
    });

    it('场景：isActive=0 的活动，应不返回', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
      stores.activities.set('a1', buildActivity({ id: 'a1', start_time: oneHourAgo, end_time: oneHourLater, is_active: 0 }));

      const result = await service.findLatestActive();

      expect(result).toBeNull();
    });
  });

  describe('findOne', () => {
    it('场景：存在，应返回该活动', async () => {
      stores.activities.set('a1', buildActivity({ id: 'a1' }));

      const result = await service.findOne('a1');

      expect(result).not.toBeNull();
    });

    it('场景：不存在，应返回 null', async () => {
      const result = await service.findOne('not-exist');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('场景：合法输入，应生成 id + 默认字段', async () => {
      const result = await service.create({
        title: '新活动',
        content: '活动内容',
        start_time: new Date('2024-12-01T10:00:00Z'),
        end_time: new Date('2024-12-01T12:00:00Z'),
        is_active: true,
        nickname: '管理员',
        phone: '999',
      });

      expect(result.id).toBeDefined();
      expect(result.title).toBe('新活动');
      expect(result.is_active).toBe(1);
    });

    it('场景：Date 对象输入，应转换为 ISO string', async () => {
      const start = new Date('2024-12-01T10:00:00Z');
      const end = new Date('2024-12-01T12:00:00Z');
      const result = await service.create({
        title: '活动',
        content: '内容',
        start_time: start,
        end_time: end,
        is_active: true,
        nickname: '管理员',
        phone: '999',
      });

      expect(typeof result.start_time).toBe('string');
      expect(result.start_time.startsWith('2024-12-01')).toBe(true);
    });

    it('场景：is_active=false，应写入 is_active=0', async () => {
      const result = await service.create({
        title: '活动',
        content: '内容',
        start_time: new Date('2024-12-01T10:00:00Z'),
        end_time: new Date('2024-12-01T12:00:00Z'),
        is_active: false,
        nickname: '管理员',
        phone: '999',
      });

      expect(result.is_active).toBe(0);
    });
  });

  describe('update', () => {
    it('场景：合法输入，应更新活动并返回新数据', async () => {
      stores.activities.set('a1', buildActivity({ id: 'a1', title: '旧' }));

      const result = await service.update('a1', {
        title: '新',
        content: '内容',
        start_time: new Date('2024-12-01T10:00:00Z'),
        end_time: new Date('2024-12-01T12:00:00Z'),
        is_active: true,
        nickname: '管理员',
        phone: '999',
      });

      expect(result).not.toBeNull();
      expect((result as { title: string }).title).toBe('新');
    });
  });

  describe('delete', () => {
    it('场景：活动存在，应返回 true 并删除', async () => {
      stores.activities.set('a1', buildActivity({ id: 'a1' }));

      const result = await service.delete('a1');

      expect(result).toBe(true);
      expect(stores.activities.has('a1')).toBe(false);
    });

    it('场景：活动不存在，应返回 false', async () => {
      const result = await service.delete('not-exist');

      expect(result).toBe(false);
    });
  });
});
