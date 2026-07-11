import { ForbiddenException } from '@nestjs/common';
import { MembersService } from './members.service';
import { createMockDbAdapter, buildMember } from '../../../../test/unit/helpers/mock-db-adapter';

describe('MembersService', () => {
  let service: MembersService;
  let db: ReturnType<typeof createMockDbAdapter>;
  let stores: ReturnType<typeof createMockDbAdapter>['stores'];

  beforeEach(() => {
    db = createMockDbAdapter();
    stores = db.stores;
    service = new MembersService(db.adapter);
  });

  describe('search', () => {
    it('场景：默认查询，应返回所有成员', async () => {
      stores.members.set('m1', buildMember({ id: 'm1' }));
      stores.members.set('m2', buildMember({ id: 'm2', nickname: '李四', phone: '13900139000' }));

      const result = await service.search({});

      expect(result).toHaveLength(2);
    });

    it('场景：按 nickname 过滤，应只返回匹配成员', async () => {
      stores.members.set('m1', buildMember({ id: 'm1', nickname: '张三', phone: '13800138000' }));
      stores.members.set('m2', buildMember({ id: 'm2', nickname: '李四', phone: '13900139000' }));

      const result = await service.search({ nickname: '张三' });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('m1');
    });

    it('场景：按 phone 过滤，应只返回匹配成员', async () => {
      stores.members.set('m1', buildMember({ id: 'm1', phone: '13800138000' }));
      stores.members.set('m2', buildMember({ id: 'm2', phone: '13900139000' }));

      const result = await service.search({ phone: '13800138000' });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('m1');
    });

    it('场景：按 role=admin 过滤，应只返回 admin', async () => {
      stores.members.set('m1', buildMember({ id: 'm1', nickname: 'adminUser', phone: '100', role: 'admin' }));
      stores.members.set('m2', buildMember({ id: 'm2', nickname: 'normalUser', phone: '200', role: 'user' }));

      const result = await service.search({ nickname: 'adminUser' });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('m1');
    });
  });

  describe('findAll', () => {
    it('场景：应返回所有成员', async () => {
      stores.members.set('m1', buildMember({ id: 'm1' }));
      stores.members.set('m2', buildMember({ id: 'm2' }));

      const result = await service.findAll();

      expect(result).toHaveLength(2);
    });
  });

  describe('findOne', () => {
    it('场景：存在，应返回该成员', async () => {
      stores.members.set('m1', buildMember({ id: 'm1' }));

      const result = await service.findOne('张三');

      expect(result).not.toBeNull();
    });

    it('场景：不存在，应返回 null', async () => {
      const result = await service.findOne('not-exist');

      expect(result).toBeNull();
    });
  });

  describe('findById / getById', () => {
    it('场景：存在，应返回该成员', async () => {
      stores.members.set('m1', buildMember({ id: 'm1' }));

      const result = await service.findById('m1');

      expect(result).not.toBeNull();
    });

    it('场景：不存在，应返回 null', async () => {
      const result = await service.findById('not-exist');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('场景：合法输入，应生成 id 且 role 默认 member', async () => {
      const result = await service.create({
        nickname: '张三',
        phone: '13800138000',
      });

      expect(result).toBeDefined();
      const created = stores.members.get(result) as { role: string };
      expect(created.role).toBe('member');
    });

    it('场景：指定 role=admin，应使用 admin', async () => {
      const result = await service.create({
        nickname: '管理员',
        phone: '999',
        role: 'admin',
      });

      const created = stores.members.get(result) as { role: string };
      expect(created.role).toBe('admin');
    });
  });

  describe('upsert', () => {
    it('场景：成员不存在，应创建（role 默认 member）', async () => {
      const result = await service.upsert({
        nickname: '张三',
        phone: '13800138000',
      });

      expect(stores.members.has(result)).toBe(true);
      const created = stores.members.get(result) as { role: string };
      expect(created.role).toBe('member');
    });

    it('场景：成员已存在（按 phone 匹配），应更新', async () => {
      stores.members.set('m1', buildMember({ id: 'm1', phone: '13800138000' }));

      const result = await service.upsert({
        nickname: '新名字',
        phone: '13800138000',
      });

      expect(result).toBe('m1');
      const updated = stores.members.get('m1') as { nickname: string };
      expect(updated.nickname).toBe('新名字');
    });

    it('场景：不同 phone，应创建新记录', async () => {
      stores.members.set('m1', buildMember({ id: 'm1', nickname: '张三', phone: '13800138000' }));

      const result = await service.upsert({
        nickname: '张三',
        phone: '13700137000',
      });

      expect(stores.members.size).toBe(2);
      expect(result).not.toBe('m1');
    });
  });

  describe('update', () => {
    it('场景：应更新指定字段', async () => {
      stores.members.set('m1', buildMember({ id: 'm1' }));

      await service.update('m1', { nickname: '新名字' });

      const updated = stores.members.get('m1') as { nickname: string };
      expect(updated.nickname).toBe('新名字');
    });
  });

  describe('delete', () => {
    it('场景：应删除指定成员', async () => {
      stores.members.set('m1', buildMember({ id: 'm1' }));

      await service.delete('m1');

      expect(stores.members.has('m1')).toBe(false);
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
