import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PostsService } from './posts.service';
import { createMockDbAdapter, buildMember, buildPost, buildReply } from '../../../../test/unit/helpers/mock-db-adapter';

describe('PostsService', () => {
  let service: PostsService;
  let db: ReturnType<typeof createMockDbAdapter>;
  let stores: ReturnType<typeof createMockDbAdapter>['stores'];

  beforeEach(() => {
    db = createMockDbAdapter();
    stores = db.stores;
    service = new PostsService(db.adapter);
  });

  describe('search', () => {
    it('场景：默认查询，应调用 findMany + count 回复数', async () => {
      stores.posts.set('p1', buildPost({ id: 'p1' }));
      stores.replies.set('r1', buildReply({ post_id: 'p1' }));

      const result = await service.search({});

      expect(result.items).toHaveLength(1);
      expect(result.items[0].reply_count).toBe(1);
    });

    it('场景：按分类过滤，应只返回匹配分类', async () => {
      stores.posts.set('p1', buildPost({ id: 'p1', category: '技术分享' }));
      stores.posts.set('p2', buildPost({ id: 'p2', category: '问题求助' }));

      const result = await service.search({ category: '技术分享' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('p1');
    });

    it('场景：按关键词搜索，应匹配 title（不区分大小写）', async () => {
      stores.posts.set('p1', buildPost({ id: 'p1', title: 'React 入门' }));
      stores.posts.set('p2', buildPost({ id: 'p2', title: 'Vue 教程' }));

      const result = await service.search({ searchKey: 'react' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('p1');
    });

    it('场景：默认排序，应按 last_reply_time 降序', async () => {
      stores.posts.set('p1', buildPost({ id: 'p1', last_reply_time: '2024-01-01T00:00:00Z' }));
      stores.posts.set('p2', buildPost({ id: 'p2', last_reply_time: '2024-02-01T00:00:00Z' }));

      const result = await service.search({});

      expect(result.items[0].id).toBe('p2');
    });

    it('场景：结果数 < pageSize，hasMore 应为 false', async () => {
      stores.posts.set('p1', buildPost({ id: 'p1' }));

      const result = await service.search({ pageSize: 20 });

      expect(result.hasMore).toBe(false);
      expect(result.nextPageToken).toBeUndefined();
    });

    it('场景：结果数 = pageSize，hasMore 应为 true 且返回 nextPageToken', async () => {
      for (let i = 0; i < 20; i += 1) {
        stores.posts.set(`p${i}`, buildPost({ id: `p${i}`, last_reply_time: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z` }));
      }

      const result = await service.search({ pageSize: 20 });

      expect(result.items).toHaveLength(20);
      expect(result.hasMore).toBe(true);
      expect(result.nextPageToken).toBeDefined();
    });

    it('场景：每个 item 应包含 reply_count 字段', async () => {
      stores.posts.set('p1', buildPost({ id: 'p1' }));
      stores.replies.set('r1', buildReply({ post_id: 'p1' }));
      stores.replies.set('r2', buildReply({ post_id: 'p1', id: 'r2' }));

      const result = await service.search({});

      expect(result.items[0].reply_count).toBe(2);
    });
  });

  describe('getById', () => {
    it('场景：帖子存在，应返回帖子 + reply_count', async () => {
      stores.posts.set('p1', buildPost({ id: 'p1' }));
      stores.replies.set('r1', buildReply({ post_id: 'p1' }));

      const result = await service.getById('p1');

      expect(result).not.toBeNull();
      expect(result?.reply_count).toBe(1);
    });

    it('场景：帖子不存在，应返回 null', async () => {
      const result = await service.getById('not-exist');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('场景：合法输入，应生成 id 并写入默认字段', async () => {
      const result = await service.create({
        title: '标题',
        category: '技术分享',
        content: '内容',
        author_nickname: '张三',
        author_phone: '13800138000',
      });

      expect(result).toBeDefined();
      const created = stores.posts.get(result) as { status: string; last_reply_time: string };
      expect(created.status).toBe('讨论中');
      expect(created.last_reply_time).toBeDefined();
    });
  });

  describe('update', () => {
    it('场景：作者本人（phone 一致），应允许更新', async () => {
      stores.posts.set('p1', buildPost({ id: 'p1', author_phone: '13800138000' }));

      await service.update('p1', { title: '新标题', nickname: '张三', phone: '13800138000' });

      const updated = stores.posts.get('p1') as { title: string };
      expect(updated.title).toBe('新标题');
    });

    it('场景：其他人，应抛 ForbiddenException', async () => {
      stores.posts.set('p1', buildPost({ id: 'p1', author_phone: '13800138000' }));

      await expect(
        service.update('p1', { title: '新标题', nickname: '李四', phone: '13900139000' })
      ).rejects.toThrow(ForbiddenException);
    });

    it('场景：admin 角色，应允许更新任何帖子', async () => {
      stores.posts.set('p1', buildPost({ id: 'p1', author_phone: '13800138000' }));
      stores.members.set('m1', buildMember({ id: 'm1', nickname: '管理员', phone: '999', role: 'admin' }));

      await service.update('p1', { title: '新标题', nickname: '管理员', phone: '999' });

      const updated = stores.posts.get('p1') as { title: string };
      expect(updated.title).toBe('新标题');
    });

    it('场景：帖子不存在，应抛 NotFoundException', async () => {
      await expect(
        service.update('not-exist', { title: '新标题', nickname: '张三', phone: '13800138000' })
      ).rejects.toThrow(NotFoundException);
    });

    it('场景：nickname/phone 不应写入 posts 集合', async () => {
      stores.posts.set('p1', buildPost({ id: 'p1', author_phone: '13800138000' }));

      await service.update('p1', { title: '新', nickname: '张三', phone: '13800138000' });

      const updated = stores.posts.get('p1') as { nickname?: string; phone?: string };
      expect(updated.nickname).toBeUndefined();
      expect(updated.phone).toBeUndefined();
    });
  });

  describe('delete', () => {
    it('场景：作者本人，应删除帖子 + 关联回复', async () => {
      stores.posts.set('p1', buildPost({ id: 'p1', author_phone: '13800138000' }));
      stores.replies.set('r1', buildReply({ post_id: 'p1' }));

      await service.delete('p1', { nickname: '张三', phone: '13800138000' });

      expect(stores.posts.has('p1')).toBe(false);
      expect(stores.replies.has('r1')).toBe(false);
    });

    it('场景：非作者且非 admin，应抛 ForbiddenException', async () => {
      stores.posts.set('p1', buildPost({ id: 'p1', author_phone: '13800138000' }));

      await expect(
        service.delete('p1', { nickname: '李四', phone: '13900139000' })
      ).rejects.toThrow(ForbiddenException);
    });

    it('场景：admin 角色，应允许删除任何帖子', async () => {
      stores.posts.set('p1', buildPost({ id: 'p1', author_phone: '13800138000' }));
      stores.members.set('m1', buildMember({ id: 'm1', nickname: '管理员', phone: '999', role: 'admin' }));

      await service.delete('p1', { nickname: '管理员', phone: '999' });

      expect(stores.posts.has('p1')).toBe(false);
    });

    it('场景：帖子不存在，应抛 NotFoundException', async () => {
      await expect(
        service.delete('not-exist', { nickname: '张三', phone: '13800138000' })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateLastReplyTime', () => {
    it('场景：应更新 last_reply_time', async () => {
      stores.posts.set('p1', buildPost({ id: 'p1' }));
      const before = (stores.posts.get('p1') as { last_reply_time?: string })?.last_reply_time ?? '';

      await service.updateLastReplyTime('p1');

      const after = (stores.posts.get('p1') as { last_reply_time?: string })?.last_reply_time;
      expect(after).toBeDefined();
      expect(after && after >= before).toBe(true);
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

    it('场景：成员不存在，应抛 ForbiddenException', async () => {
      await expect(service.verifyAdmin('不存在', '000')).rejects.toThrow(ForbiddenException);
    });
  });
});
