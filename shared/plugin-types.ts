// ---- plugin:table_management_crud_aggregation_2 ----
// ============================================================
// 插件 table_management_crud_aggregation_2 (成员表) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface TableManagementCrudAggregationTwoInput {
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  pageSize?: number;
  /** [object Object] */
  fieldNames?: string[];
  /** [object Object] */
  sort?: {
    fieldName: string;
    desc: boolean;
  }[];
  /** [object Object] */
  filter?: {
    conjunction: string;
    conditions: {
      fieldName: string;
      operator: string;
      value: string[];
    }[];
  };
}

/**
 * capabilityClient.load('table_management_crud_aggregation_2').call<TableManagementCrudAggregationTwoOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { hasMore, pageToken, total, ... } = result;
 */
export interface TableManagementCrudAggregationTwoOutput {
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  total?: number;
  /** [object Object] */
  records: {
    id: string;
    record: {
      '加入时间': number;
      '成员名称': {
        text: string;
      };
      '用户': number[];
      '角色': string;
    };
  }[];
}
// ---- end:table_management_crud_aggregation_2 ----

// ---- plugin:table_management_crud_aggregation_1 ----
// ============================================================
// 插件 table_management_crud_aggregation_1 (帖子表) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface TableManagementCrudAggregationOneInput {
  /** [object Object] */
  fieldNames?: string[];
  /** [object Object] */
  sort?: {
    fieldName: string;
    desc: boolean;
  }[];
  /** [object Object] */
  filter?: {
    conjunction: string;
    conditions: {
      fieldName: string;
      operator: string;
      value: string[];
    }[];
  };
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  pageSize?: number;
}

/**
 * capabilityClient.load('table_management_crud_aggregation_1').call<TableManagementCrudAggregationOneOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { hasMore, pageToken, total, ... } = result;
 */
export interface TableManagementCrudAggregationOneOutput {
  /** [object Object] */
  hasMore: boolean;
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  total?: number;
  /** [object Object] */
  records: {
    id: string;
    record: {
      '状态': string;
      '内容': unknown;
      '标题': {
        text: string;
      };
      '分类': string;
      '创建时间': number;
      '附件': {
        name: string;
        size: number;
        tmpUrl: string;
        type: string;
      }[];
      '发起人': number[];
      '最后回复时间': number;
      '回复数': {
        value: unknown;
        bizType: string;
      };
    };
  }[];
}
// ---- end:table_management_crud_aggregation_1 ----

// ---- plugin:table_management_crud_aggregation_3 ----
// ============================================================
// 插件 table_management_crud_aggregation_3 (回复表) 的类型定义
// 由 get_plugin_ai_json 自动生成
// ============================================================

export interface TableManagementCrudAggregationThreeBatchaddrecordsInput {
  /** [object Object] */
  records: {
    record: {
      '回复人': number[];
      '回复时间': number;
      '是否采纳': boolean;
      '帖子ID': string;
      '内容': string;
    };
  }[];
}

/**
 * capabilityClient.load('table_management_crud_aggregation_3').call<TableManagementCrudAggregationThreeBatchaddrecordsOutput>('batchAddRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 */
export interface TableManagementCrudAggregationThreeBatchaddrecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface TableManagementCrudAggregationThreeBatchupdaterecordsInput {
  /** [object Object] */
  records: {
    id: string;
    record: {
      '帖子ID': string;
      '内容': string;
      '回复人': number[];
      '回复时间': number;
      '是否采纳': boolean;
    };
  }[];
}

/**
 * capabilityClient.load('table_management_crud_aggregation_3').call<TableManagementCrudAggregationThreeBatchupdaterecordsOutput>('batchUpdateRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { records } = result;
 */
export interface TableManagementCrudAggregationThreeBatchupdaterecordsOutput {
  /** [object Object] */
  records: {
    id: string;
  }[];
}

export interface TableManagementCrudAggregationThreeDeleterecordsInput {
  /** [object Object] */
  recordIDs: string[];
}

/**
 * capabilityClient.load('table_management_crud_aggregation_3').call<TableManagementCrudAggregationThreeDeleterecordsOutput>('deleteRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { success } = result;
 */
export interface TableManagementCrudAggregationThreeDeleterecordsOutput {
  /** [object Object] */
  success: boolean;
}

export interface TableManagementCrudAggregationThreeSearchrecordsInput {
  /** [object Object] */
  fieldNames?: string[];
  /** [object Object] */
  sort?: {
    fieldName: string;
    desc: boolean;
  }[];
  /** [object Object] */
  filter?: {
    conjunction: string;
    conditions: {
      value: string[];
      fieldName: string;
      operator: string;
    }[];
  };
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  pageSize?: number;
}

/**
 * capabilityClient.load('table_management_crud_aggregation_3').call<TableManagementCrudAggregationThreeSearchrecordsOutput>('searchRecords', input)
 * 直接返回此类型，无 .data 包装，直接解构使用：
 * const { pageToken, total, records, ... } = result;
 */
export interface TableManagementCrudAggregationThreeSearchrecordsOutput {
  /** [object Object] */
  pageToken?: string;
  /** [object Object] */
  total?: number;
  /** [object Object] */
  records: {
    id: string;
    record: {
      '内容': {
        text: string;
      };
      '回复人': number[];
      '回复时间': number;
      '是否采纳': unknown;
      '帖子ID': unknown;
    };
  }[];
  /** [object Object] */
  hasMore: boolean;
}
// ---- end:table_management_crud_aggregation_3 ----