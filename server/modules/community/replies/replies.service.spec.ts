import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { RepliesService } from './replies.service';
import { createMockDbAdapter, buildMember, buildReply } from '../../../../test/unit/helpers/mock-db-adapter';

describe('RepliesService', () => {
  let service: RepliesService;
  let db: ReturnType<typeof createMockDbAdapter>;
  let stores: ReturnType<typeof createMockDbAdapter>['stores'];

  beforeEach(() => {
    db = createMockDbAdapter();
    stores = db.stores;
    service = new RepliesService(db.adapter);
  });

  describe('search', () => {
    it('场景：正常查询，应按 postId 过滤并升序', async () => {
      stores.replies.set('r1', buildReply({ id: 'r1', post_id: 'p1', created_at: '2024-01-02T00:00:00Z' }));
      stores.replies.set('r2', buildReply({ id: 'r2', post_id: 'p1', created_at: '2024-01-01T00:00:00Z' }));
      stores.replies.set('r3', buildReply({ id: 'r3', post_id: 'p2', created_at: '2024-01-01T00:00:00Z' }));

      const result = await service.search({ post_id: 'p1' });

      expect(result.items).toHaveLength(2);
      expect(result.items[0].id).toBe('r2');
      expect(result.items[1].id).toBe('r1');
    });

    it('场景：分页 pageSize，应返回 ≤ pageSize 条', async () => {
      for (let i = 0; i < 5; i += 1) {
        stores.replies.set(`r${i}`, buildReply({ id: `r${i}`, post_id: 'p1' }));
      }

      const result = await service.search({ post_id: 'p1', pageSize: 3 });

      expect(result.items).toHaveLength(3);
      expect(result.hasMore).toBe(true);
    });
  });

  describe('getById', () => {
    it('场景：回复存在，应返回该回复', async () => {
      stores.replies.set('r1', buildReply({ id: 'r1' }));

      const result = await service.getById('r1');

      expect(result).not.toBeNull();
    });

    it('场景：回复不存在，应返回 null', async () => {
      const result = await service.getById('not-exist');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('场景：合法输入，应生成 id 且 is_adopted=0', async () => {
      const result = await service.create({
        post_id: 'p1',
        content: '回复内容',
        replier_nickname: '李四',
        replier_phone: '13900139000',
      });

      expect(result).toBeDefined();
      const created = stores.replies.get(result) as { is_adopted: number; post_id: string };
      expect(created.is_adopted).toBe(0);
      expect(created.post_id).toBe('p1');
    });
  });

  describe('update', () => {
    it('场景：作者本人（phone 一致），应允许更新 content', async () => {
      stores.replies.set('r1', buildReply({ id: 'r1', replier_phone: '13900139000' }));

      await service.update('r1', { content: '新内容', nickname: '李四', phone: '13900139000' });

      const updated = stores.replies.get('r1') as { content: string };
      expect(updated.content).toBe('新内容');
    });

    it('场景：非作者且非 admin，应抛 ForbiddenException', async () => {
      stores.replies.set('r1', buildReply({ id: 'r1', replier_phone: '13900139000' }));

      await expect(
        service.update('r1', { content: '新内容', nickname: '王五', phone: '13700137000' })
      ).rejects.toThrow(ForbiddenException);
    });

    it('场景：admin 角色，应允许更新任何回复', async () => {
      stores.replies.set('r1', buildReply({ id: 'r1', replier_phone: '13900139000' }));
      stores.members.set('m1', buildMember({ id: 'm1', nickname: '管理员', phone: '999', role: 'admin' }));

      await service.update('r1', { content: '新内容', nickname: '管理员', phone: '999' });

      const updated = stores.replies.get('r1') as { content: string };
      expect(updated.content).toBe('新内容');
    });

    it('场景：回复不存在，应抛 NotFoundException', async () => {
      await expect(
        service.update('not-exist', { content: '新内容', nickname: '李四', phone: '13900139000' })
      ).rejects.toThrow(NotFoundException);
    });

    it('场景：通过 update() 修改 is_adopted，应抛 BadRequestException', async () => {
      stores.replies.set('r1', buildReply({ id: 'r1', replier_phone: '13900139000' }));

      await expect(
        service.update('r1', { is_adopted: true, nickname: '李四', phone: '13900139000' })
      ).rejects.toThrow(BadRequestException);
    });

    it('场景：通过 update() 取消采纳 is_adopted=false，应抛 BadRequestException', async () => {
      stores.replies.set('r1', buildReply({ id: 'r1', replier_phone: '13900139000', is_adopted: 1 }));

      await expect(
        service.update('r1', { is_adopted: false, nickname: '李四', phone: '13900139000' })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete', () => {
    it('场景：作者本人，应允许删除', async () => {
      stores.replies.set('r1', buildReply({ id: 'r1', replier_phone: '13900139000' }));

      await service.delete('r1', { nickname: '李四', phone: '13900139000' });

      expect(stores.replies.has('r1')).toBe(false);
    });

    it('场景：非作者且非 admin，应抛 ForbiddenException', async () => {
      stores.replies.set('r1', buildReply({ id: 'r1', replier_phone: '13900139000' }));

      await expect(
        service.delete('r1', { nickname: '王五', phone: '13700137000' })
      ).rejects.toThrow(ForbiddenException);
    });

    it('场景：admin 角色，应允许删除任何回复', async () => {
      stores.replies.set('r1', buildReply({ id: 'r1', replier_phone: '13900139000' }));
      stores.members.set('m1', buildMember({ id: 'm1', nickname: '管理员', phone: '999', role: 'admin' }) as never);

      await service.delete('r1', { nickname: '管理员', phone: '999' });

      expect(stores.replies.has('r1')).toBe(false);
    });

    it('场景：回复不存在，应抛 NotFoundException', async () => {
      await expect(
        service.delete('not-exist', { nickname: '李四', phone: '13900139000' })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteAll', () => {
    it('场景：应删除所有回复', async () => {
      stores.replies.set('r1', buildReply({ id: 'r1' }));
      stores.replies.set('r2', buildReply({ id: 'r2' }));

      await service.deleteAll();

      expect(stores.replies.size).toBe(0);
    });
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
  });
});
