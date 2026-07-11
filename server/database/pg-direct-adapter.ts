import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import type { DbAdapter } from './db-adapter';
import type { DbEntity } from './db-types';

@Injectable()
export class CloudBasePgAdapter implements DbAdapter, OnModuleInit, OnModuleDestroy {
  // 命名说明：本类底层走的是腾讯云 CloudBase 的 ExecutePGSql（HTTP/RPC 中转），
  // 并不是直连 PostgreSQL。schema 默认遵循线上惯例 tech_hub，可由环境变量 DB_SCHEMA 覆盖。
  private readonly schema: string;

  constructor() {
    this.schema = process.env.DB_SCHEMA || 'tech_hub';
  }

  async onModuleInit() {
    console.log(`CloudBase PgAdapter initialized (schema: ${this.schema})`);
  }

  async onModuleDestroy() {}

  private escapeValue(value: unknown): string {
    if (value === null || value === undefined) {
      return 'NULL';
    }
    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "''")}'`;
    }
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }
    if (typeof value === 'number') {
      return String(value);
    }
    if (value instanceof Date) {
      return `'${value.toISOString()}'`;
    }
    return String(value);
  }

  private buildCondition(key: string, value: unknown): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }
    if (typeof value === 'object' && !Array.isArray(value)) {
      const obj = value as Record<string, unknown>;
      const ops: string[] = [];
      if (obj.$eq !== undefined) {
        ops.push(`${key} = ${this.escapeValue(obj.$eq)}`);
      }
      if (obj.$ne !== undefined) {
        ops.push(`${key} != ${this.escapeValue(obj.$ne)}`);
      }
      if (obj.$lt !== undefined) {
        ops.push(`${key} < ${this.escapeValue(obj.$lt)}`);
      }
      if (obj.$lte !== undefined) {
        ops.push(`${key} <= ${this.escapeValue(obj.$lte)}`);
      }
      if (obj.$gt !== undefined) {
        ops.push(`${key} > ${this.escapeValue(obj.$gt)}`);
      }
      if (obj.$gte !== undefined) {
        ops.push(`${key} >= ${this.escapeValue(obj.$gte)}`);
      }
      return ops.join(' AND ');
    }
    return `${key} = ${this.escapeValue(value)}`;
  }

  async executeSql(sql: string): Promise<any> {
    try {
      const secretId = process.env.TENCENTCLOUD_SECRETID;
      const secretKey = process.env.TENCENTCLOUD_SECRETKEY;
      const sessionToken = process.env.TENCENTCLOUD_SESSIONTOKEN;
      const envId = process.env.CLOUDBASE_ENV_ID;

      if (!secretId || !secretKey) {
        throw new Error('TencentCloud credentials not available');
      }
      if (!envId) {
        throw new Error('CLOUDBASE_ENV_ID not configured');
      }

      const tcb = require('tencentcloud-sdk-nodejs/tencentcloud/services/tcb/v20180608');
      const { BasicCredential } = require('tencentcloud-sdk-nodejs/tencentcloud/common');

      const credential = new BasicCredential(secretId, secretKey, sessionToken);

      const client = new tcb.v20180608.Client({
        credential,
        region: process.env.TENCENTCLOUD_REGION || 'ap-guangzhou',
        profile: {
          httpProfile: {
            endpoint: 'tcb.tencentcloudapi.com',
          },
        },
      });

      const params = {
        EnvId: envId,
        Sql: sql
      };

      const result = await client.ExecutePGSql(params);
      const response = result as any;

      if (response.Columns && response.Rows) {
        const rows = response.Rows.map((row: string) => JSON.parse(row));
        return { data: rows.map((row: any[]) => {
          const obj: Record<string, any> = {};
          response.Columns.forEach((col: string, colIndex: number) => {
            obj[col] = row[colIndex];
          });
          return obj;
        })};
      }

      return { data: [] };
    } catch (error: any) {
      console.error('SQL execute failed:', sql, error.message);
      throw error;
    }
  }

  async findOne<T extends DbEntity = DbEntity>(collection: string, query: Record<string, unknown>): Promise<T | null> {
    const conditions = Object.entries(query)
      .map(([k, v]) => this.buildCondition(k, v))
      .filter(Boolean)
      .join(' AND ');

    const sql = conditions
      ? `SELECT * FROM ${this.schema}.${collection} WHERE ${conditions} LIMIT 1`
      : `SELECT * FROM ${this.schema}.${collection} LIMIT 1`;

    try {
      const result = await this.executeSql(sql);
      return result.data?.[0] as T | null;
    } catch (error: any) {
      console.error('SQL execute failed:', sql, error.message);
      return null;
    }
  }

  async findMany<T extends DbEntity = DbEntity>(collection: string, query: Record<string, unknown>, options?: {
    limit?: number;
    skip?: number;
    orderBy?: { field: string; direction: 'asc' | 'desc' };
  }): Promise<T[]> {
    const conditions = Object.entries(query)
      .map(([k, v]) => this.buildCondition(k, v))
      .filter(Boolean)
      .join(' AND ');

    let sql = `SELECT * FROM ${this.schema}.${collection}`;
    if (conditions) {
      sql += ` WHERE ${conditions}`;
    }
    if (options?.orderBy) {
      sql += ` ORDER BY ${options.orderBy.field} ${options.orderBy.direction.toUpperCase()}`;
    }
    if (options?.limit) {
      sql += ` LIMIT ${options.limit}`;
    }
    if (options?.skip) {
      sql += ` OFFSET ${options.skip}`;
    }

    try {
      const result = await this.executeSql(sql);
      return result.data as T[];
    } catch (error: any) {
      console.error('SQL execute failed:', sql, error.message);
      return [];
    }
  }

  async create(collection: string, data: Record<string, unknown>): Promise<string> {
    const keys = Object.keys(data).filter(k => data[k] !== undefined && data[k] !== null);
    const values = keys.map(k => this.escapeValue(data[k]));

    const sql = `INSERT INTO ${this.schema}.${collection} (${keys.join(', ')}) VALUES (${values.join(', ')}) RETURNING id`;

    try {
      const result = await this.executeSql(sql);
      return result.data?.[0]?.id as string;
    } catch (error: any) {
      console.error('SQL execute failed:', sql, error.message);
      throw new Error(`创建失败: ${error.message}`);
    }
  }

  async update(collection: string, id: string, data: Record<string, unknown>): Promise<void> {
    const updates = Object.entries(data)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${k} = ${this.escapeValue(v)}`)
      .join(', ');

    if (!updates) {
      return;
    }

    const sql = `UPDATE ${this.schema}.${collection} SET ${updates} WHERE id = ${this.escapeValue(id)}`;

    try {
      await this.executeSql(sql);
    } catch (error: any) {
      console.error('SQL execute failed:', sql, error.message);
      throw new Error(`更新失败: ${error.message}`);
    }
  }

  async delete(collection: string, id: string): Promise<void> {
    const sql = `DELETE FROM ${this.schema}.${collection} WHERE id = ${this.escapeValue(id)}`;

    try {
      await this.executeSql(sql);
    } catch (error: any) {
      console.error('SQL execute failed:', sql, error.message);
      throw new Error(`删除失败: ${error.message}`);
    }
  }

  async count(collection: string, query: Record<string, unknown>): Promise<number> {
    const conditions = Object.entries(query)
      .map(([k, v]) => this.buildCondition(k, v))
      .filter(Boolean)
      .join(' AND ');

    const sql = conditions
      ? `SELECT COUNT(*) as count FROM ${this.schema}.${collection} WHERE ${conditions}`
      : `SELECT COUNT(*) as count FROM ${this.schema}.${collection}`;

    try {
      const result = await this.executeSql(sql);
      return parseInt(result.data?.[0]?.count, 10) || 0;
    } catch (error: any) {
      console.error('SQL execute failed:', sql, error.message);
      return 0;
    }
  }

  async findById<T extends DbEntity = DbEntity>(collection: string, id: string): Promise<T | null> {
    return this.findOne<T>(collection, { id });
  }
}