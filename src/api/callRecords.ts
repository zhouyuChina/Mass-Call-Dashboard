/**
 * 通话记录相关 API
 */

import { apiClient } from './client';

/**
 * 通话记录条目（与后端 API 返回的数据结构一致）
 */
export interface CallRecordEntry {
  id: string;
  recordType?: string;
  url?: string;
  content?: string;
  htmlContent?: string;
  responseBody?: string;
  parsedData?: {
    rawHtml?: string;
    [key: string]: any;
  };
  statusCode?: number;
  metadata?: {
    requestMethod?: string;
    [key: string]: any;
  };
  createdAt?: string;
  updatedAt?: string;
  lastUpdateTime?: string;
}

/**
 * 通话记录列表响应
 */
export interface CallRecordsApiResponse {
  data?: CallRecordEntry[];
  total?: number;
  page?: number;
  limit?: number;
}

/**
 * 通话记录查询参数
 */
export interface CallRecordsParams {
  page?: number;
  limit?: number;
  recordType?: string;
}

/**
 * 通话记录 API
 */
export const callRecordsApi = {
  /**
   * 获取通话记录列表
   */
  async getList(params: CallRecordsParams = {}): Promise<CallRecordsApiResponse> {
    return apiClient.get<CallRecordsApiResponse>('/call-records', {
      page: params.page || 1,
      limit: params.limit || 20,
      ...(params.recordType && { recordType: params.recordType }),
    });
  },

  /**
   * 获取最新的单条记录
   */
  async getLatest(recordType: string): Promise<CallRecordEntry> {
    return apiClient.get<CallRecordEntry>(`/call-records/latest/${recordType}`);
  },

  /**
   * 获取指定 ID 的记录
   */
  async getById(id: string): Promise<CallRecordEntry> {
    return apiClient.get<CallRecordEntry>(`/call-records/${id}`);
  },
};
