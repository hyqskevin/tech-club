import type { DbEntity } from './db-types';

export interface DbAdapter {
  findOne<T extends DbEntity = DbEntity>(collection: string, query: Record<string, unknown>): Promise<T | null>;
  findMany<T extends DbEntity = DbEntity>(collection: string, query: Record<string, unknown>, options?: {
    limit?: number;
    skip?: number;
    orderBy?: { field: string; direction: 'asc' | 'desc' };
  }): Promise<T[]>;
  create(collection: string, data: Record<string, unknown>): Promise<string>;
  update(collection: string, id: string, data: Record<string, unknown>): Promise<void>;
  delete(collection: string, id: string): Promise<void>;
  count(collection: string, query: Record<string, unknown>): Promise<number>;
  findById<T extends DbEntity = DbEntity>(collection: string, id: string): Promise<T | null>;
}