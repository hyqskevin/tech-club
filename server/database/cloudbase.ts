import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import cloudbase from '@cloudbase/node-sdk';

type RdbTable = {
  url: URL;
  headers: Record<string, string>;
  fetch: (input: string, init?: RequestInit) => Promise<Response>;
};

type RdbClient = {
  from: (table: string) => RdbTable;
};

type CloudBaseApp = ReturnType<typeof cloudbase.init> & {
  rdb?: (options?: { database?: string }) => RdbClient;
};

@Injectable()
export class CloudBaseDatabase implements OnModuleInit, OnModuleDestroy {
  private db: ReturnType<ReturnType<typeof cloudbase.init>['database']> | null = null;
  private rdb: RdbClient | null = null;
  private app: CloudBaseApp | null = null;

  async onModuleInit() {
    try {
      const envId = process.env.CLOUDBASE_ENV_ID;
      const secretId = process.env.CLOUDBASE_SECRETID || process.env.TENCENTCLOUD_SECRETID;
      const secretKey = process.env.CLOUDBASE_SECRETKEY || process.env.TENCENTCLOUD_SECRETKEY;

      if (!envId) {
        console.log('CloudBase env not configured');
        return;
      }

      const isCloudFunction = !!process.env.TCB_ENV || !!process.env.SCF_RUNTIME || (process.env.NODE_ENV === 'production');
      
      const initOptions: Record<string, unknown> = { env: envId };
      
      if (!isCloudFunction && secretId && secretKey) {
        initOptions.secretId = secretId;
        initOptions.secretKey = secretKey;
        console.log('CloudBase init with API key credentials (local development)');
      } else {
        console.log('CloudBase init without credentials (cloud function environment)');
      }

      this.app = cloudbase.init(initOptions) as CloudBaseApp;

      this.db = this.app.database();

      if (this.app.rdb) {
        this.rdb = this.app.rdb({ database: 'public' });
        console.log('PostgreSQL RDB client initialized');
      }

      console.log('CloudBase database connected successfully');
    } catch (error) {
      console.error('CloudBase database connection failed:', error);
      this.db = null;
      this.rdb = null;
    }
  }

  async onModuleDestroy() {
    this.db = null;
    this.rdb = null;
  }

  getDb() {
    return this.db;
  }

  getRdb(): RdbClient | null {
    return this.rdb;
  }
}