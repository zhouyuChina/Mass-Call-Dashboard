/**
 * 集成面板状态类型定义
 */

import type { CallRecord, MonitorSummary, PeerSeatStatusRow } from './callRecords';
import type { OverviewStats, DomainAnalysisResponse, TimeSeriesEntry } from './api';

/**
 * 集成面板状态
 */
export interface IntegrationPanelState {
  status: 'idle' | 'loading' | 'success' | 'error';
  error?: string | null;
  overview: OverviewStats | null;
  domainAnalysis: DomainAnalysisResponse | null;
  timeSeries: TimeSeriesEntry[];
  records: CallRecord[];
  lastSyncedAt: Date | null;
  sources: string[];
  monitorSummaries: Record<string, MonitorSummary | undefined>;
  seatStatuses: Record<string, PeerSeatStatusRow[] | undefined>;
}
