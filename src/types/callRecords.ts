/**
 * 通话记录相关类型定义
 */

/**
 * 座席状态类型
 */
export type SeatStatusType = 'online' | 'offline' | 'ringing' | 'inCall' | 'disconnected';

/**
 * 对端座席颜色
 */
export type PeerSeatColor = 'green' | 'red' | 'purple' | 'blue' | 'grey';

/**
 * 对端座席状态
 */
export interface PeerSeatStatus {
  seatNumber: number;
  status: SeatStatusType;
}

/**
 * 对端座席状态行
 */
export type PeerSeatStatusRow = PeerSeatStatus[];

/**
 * 通话记录接口
 */
export interface CallRecord {
  id: string;
  calledNumber: string; // 被叫號碼
  callbackNumber?: string;
  agent: number; // 坐席號
  note: string; // 備註
  callStatus: string; // 呼叫狀態
  duration: number; // 通話時長（秒）
  recordingUrl: string; // 通話錄音檔案URL
  callTime: Date; // 通話時間
  panel: 'A' | string; // 所屬面板
  integrationSource?: string;
  transcript?: {
    chinese: string; // 中文文本（可能是原文或翻譯）
    english?: string; // 英文原文（如果存在）
    isTranslated: boolean; // 是否為翻譯
  };
}

/**
 * 监控摘要
 */
export interface MonitorSummary {
  manualCalls: number;
  segmentCounts: {
    segment1: number;
    segment2: number;
    segment3: number;
    segment4: number;
  };
  voiceCallCount?: number;
  connectRate?: number;
  callbackRate?: number;
  connectRateSamples?: number;
  callbackRateSamples?: number;
}

/**
 * 监控通话行
 */
export interface MonitorCallRow {
  sequence?: number;
  calledNumber: string;
  callbackNumber?: string;
  callStatus: string;
  startTime?: string;
  durationText?: string;
  rawHtml?: string;
  derivedAgent?: number;
}

/**
 * 监控数据源
 */
export interface MonitorSourceData {
  source: string;
  capturedAt?: string;
  calls: MonitorCallRow[];
  summary: MonitorSummary;
  seatStatuses?: PeerSeatStatusRow[];
}

/**
 * 座席显示状态
 */
export interface AgentDisplayState {
  seatNumber: number;
  status: 'inCall' | 'ringing' | 'online' | 'offline' | 'noData';
  stats: {
    answered: number;
    hungUp: number;
    avgDuration: number;
    maxDuration: number;
    maxCallNumber: string;
    onlineTime: number;
  };
}
