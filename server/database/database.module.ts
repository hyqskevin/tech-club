import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CloudBaseDatabase } from './cloudbase';
import { CloudBaseRdbAdapter } from './cloudbase-rdb-adapter';
import { PgDirectAdapter } from './pg-direct-adapter';

export const DB_ADAPTER = Symbol('DB_ADAPTER');

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    CloudBaseDatabase,
    PgDirectAdapter,
    {
      provide: DB_ADAPTER,
      useFactory: (cbDb: CloudBaseDatabase, pgAdapter: PgDirectAdapter) => {
        const usePgDirect = process.env.DB_ADAPTER === 'pg';
        if (usePgDirect) {
          console.log('Using PostgreSQL RDB adapter (tech_hub schema)');
          return pgAdapter;
        }
        console.log('Using CloudBase RDB adapter (public schema)');
        return new CloudBaseRdbAdapter(cbDb);
      },
      inject: [CloudBaseDatabase, PgDirectAdapter],
    },
  ],
  exports: [CloudBaseDatabase, PgDirectAdapter, DB_ADAPTER],
})
export class DatabaseModule {}