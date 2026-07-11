import type { DbAdapter } from './db-adapter';
import type { DbEntity } from './db-types';
import { CloudBaseDatabase } from './cloudbase';

export class CloudBaseRdbAdapter implements DbAdapter {
  constructor(private readonly cb: CloudBaseDatabase) {}

  private async request(table: string, params: Record<string, string> = {}): Promise<unknown[]> {
    const rdb = this.cb.getRdb();
    if (!rdb) return [];

    const tableClient = rdb.from(table);
    // params 形态：{'nickname': 'eq.admin', 'phone': 'eq.222413'} 或 {'order': 'lastReplyTime.desc', 'limit': '20'}
    // 直接拼成 PostgREST 过滤语法；空值跳过
    const queryString = Object.entries(params)
      .filter(([, v]) => v !== '' && v !== null && v !== undefined)
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
      .join('&');
    const url = `${tableClient.url.href}${queryString ? '?' + queryString : ''}`;

    const response = await tableClient.fetch(url, {
      method: 'GET',
      headers: tableClient.headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('RDB请求失败:', url, errorData);
      return [];
    }

    return response.json() as Promise<unknown[]>;
  }

  async findOne<T extends DbEntity = DbEntity>(collection: string, query: Record<string, unknown>): Promise<T | null> {
    const params: Record<string, string> = {};

    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue;
      params[key] = `eq.${value}`;
    }
    params.limit = '1';

    const data = await this.request(collection, params);
    return (data[0] ?? null) as T | null;
  }

  async findMany<T extends DbEntity = DbEntity>(collection: string, query: Record<string, unknown>, options?: {
    limit?: number;
    skip?: number;
    orderBy?: { field: string; direction: 'asc' | 'desc' };
  }): Promise<T[]> {
    const params: Record<string, string> = {};

    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue;
      params[key] = `eq.${value}`;
    }

    if (options?.orderBy) {
      params.order = `${options.orderBy.field}.${options.orderBy.direction}`;
    }
    if (options?.limit) {
      params.limit = String(options.limit);
    }
    if (options?.skip) {
      params.offset = String(options.skip);
    }

    const data = await this.request(collection, params);
    return data as T[];
  }

  async create(collection: string, data: Record<string, unknown>): Promise<string> {
    const rdb = this.cb.getRdb();
    if (!rdb) throw new Error('CloudBase RDB not available');

    const tableClient = rdb.from(collection);

    const response = await tableClient.fetch(tableClient.url.href, {
      method: 'POST',
      headers: {
        ...tableClient.headers,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`创建失败: ${JSON.stringify(errorData)}`);
    }

    await response.json();
    const id = data.id;
    if (id === null || id === undefined) {
      return '';
    }
    if (typeof id === 'string') {
      return id;
    }
    if (typeof id === 'number' || typeof id === 'boolean') {
      return String(id);
    }
    return '';
  }

  async update(collection: string, id: string, data: Record<string, unknown>): Promise<void> {
    const rdb = this.cb.getRdb();
    if (!rdb) throw new Error('CloudBase RDB not available');

    const tableClient = rdb.from(collection);
    const url = `${tableClient.url.href}?id=eq.${id}`;

    const response = await tableClient.fetch(url, {
      method: 'PATCH',
      headers: {
        ...tableClient.headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`更新失败: ${JSON.stringify(errorData)}`);
    }
  }

  async delete(collection: string, id: string): Promise<void> {
    const rdb = this.cb.getRdb();
    if (!rdb) throw new Error('CloudBase RDB not available');

    const tableClient = rdb.from(collection);
    const url = `${tableClient.url.href}?id=eq.${id}`;

    const response = await tableClient.fetch(url, {
      method: 'DELETE',
      headers: tableClient.headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`删除失败: ${JSON.stringify(errorData)}`);
    }
  }

  async count(collection: string, query: Record<string, unknown>): Promise<number> {
    const params: Record<string, string> = {};

    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue;
      params[key] = `eq.${value}`;
    }
    params.select = '';
    params.count = 'exact';

    const rdb = this.cb.getRdb();
    if (!rdb) return 0;

    const tableClient = rdb.from(collection);
    const queryString = Object.entries(params)
      .filter(([, v]) => v !== '' && v !== null && v !== undefined)
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
      .join('&');
    const url = `${tableClient.url.href}?${queryString}`;

    const response = await tableClient.fetch(url, {
      method: 'GET',
      headers: tableClient.headers,
    });

    if (!response.ok) {
      return 0;
    }

    const countHeader = response.headers.get('content-range');
    if (countHeader) {
      const match = countHeader.match(/\/(\d+)$/);
      if (match) {
        return parseInt(match[1], 10);
      }
    }

    return 0;
  }

  async findById<T extends DbEntity = DbEntity>(collection: string, id: string): Promise<T | null> {
    return this.findOne<T>(collection, { id });
  }
}