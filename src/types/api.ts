/**
 * API 相关类型定义
 */

/**
 * API 网页记录
 */
export interface ApiWebpageRecord {
  id?: string;
  url: string;
  recordType?: string;
  title?: string;
  content?: string;
  htmlContent?: string;
  domain?: string;
  metadata?: {
    description?: string;
    statusCode?: number;
    requestMethod?: string;
    [key: string]: any;
  };
  createdAt?: string;
  updatedAt?: string;
  capturedAt?: string;
}

/**
 * 通话记录 API 条目
 */
export interface CallRecordApiEntry {
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
 * 通话记录 API 响应
 */
export interface CallRecordsApiResponse {
  data?: CallRecordApiEntry[];
}

/**
 * 网页 API 响应
 */
export interface WebpageApiResponse {
  data: ApiWebpageRecord[];
}

/**
 * 概览统计
 */
export interface OverviewStats {
  totalWebpages: number;
  totalDomains: number;
  todayCount: number;
  weekCount: number;
  averagePerDay: number;
}

/**
 * 域名分析项
 */
export interface DomainAnalysisItem {
  domain: string;
  count: number;
  percentage: number;
}

/**
 * 域名分析响应
 */
export interface DomainAnalysisResponse {
  domains: DomainAnalysisItem[];
}

/**
 * 时间序列条目
 */
export interface TimeSeriesEntry {
  date: string;
  count: number;
}
