import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CloudBaseDatabase } from './cloudbase';
import { CloudBaseRdbAdapter } from './cloudbase-rdb-adapter';
import { CloudBasePgAdapter } from './pg-direct-adapter';

export const DB_ADAPTER = Symbol('DB_ADAPTER');

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    CloudBaseDatabase,
    CloudBasePgAdapter,
    {
      provide: DB_ADAPTER,
      useFactory: (cbDb: CloudBaseDatabase, pgAdapter: CloudBasePgAdapter) => {
        const usePgDirect = process.env.DB_ADAPTER === 'pg';
        if (usePgDirect) {
          console.log(`Using CloudBase ExecutePGSql adapter (schema: ${process.env.DB_SCHEMA || 'tech_hub'})`);
          return pgAdapter;
        }
        console.log('Using CloudBase RDB adapter (public schema)');
        return new CloudBaseRdbAdapter(cbDb);
      },
      inject: [CloudBaseDatabase, CloudBasePgAdapter],
    },
  ],
  exports: [CloudBaseDatabase, CloudBasePgAdapter, DB_ADAPTER],
})
export class DatabaseModule {}