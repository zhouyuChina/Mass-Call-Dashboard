/**
 * 数据转换工具函数
 * 用于将 API 数据转换为应用内部使用的格式
 */

import type { ApiWebpageRecord, CallRecord, MonitorSourceData } from '../../types';
import { createEmptyMonitorSummary, parseCallTable, parseCampaignControllerTable, parsePeerStatusHtml, extractCampaignRates } from './htmlParser';
import { hashString } from '../../utils/callRecordUtils';

// 正则表达式常量
const TARGET_CALL_PAGE_REGEX = /get_curcall_in\.php\?/i;
const TARGET_PEER_STATUS_REGEX = /get_peer_status\.php\?/i;
const TARGET_CAMPAIGN_CONTROLLER_REGEX = /cont_controler\.php\?/i;

/**
 * 从源字符串构建拨号号码
 */
export function buildDialNumberFromSource(source: string, seed: number): string {
  const digitsOnly = source.replace(/\D/g, '');
  if (digitsOnly.length >= 10) {
    return digitsOnly.slice(0, 10);
  }

  let numericSeed = digitsOnly;
  const fallback = `${Math.abs(hashString(source))}${seed}`;
  numericSeed += fallback;

  return numericSeed.slice(0, 10).padEnd(10, '0');
}

/**
 * 根据状态码推导通话状态
 */
export function deriveCallStatus(statusCode?: number, index: number = 0): string {
  if (statusCode && statusCode >= 500) {
    return '通話中';
  }
  if (statusCode && statusCode >= 400) {
    return '轉座席';
  }
  return index % 4 === 0 ? '通話中' : '主打撥打';
}

/**
 * 提取源标签
 */
export function extractSourceLabel(page: ApiWebpageRecord, index: number): string {
  const rawUrl = page.url || '';
  if (rawUrl) {
    try {
      const parsed = new URL(rawUrl);
      if (parsed.hostname) {
        return parsed.port ? `${parsed.hostname}:${parsed.port}` : parsed.hostname;
      }
    } catch {
      const match = rawUrl.match(/https?:\/\/([^/]+)/i);
      if (match && match[1]) {
        return match[1];
      }
    }
  }

  if (page.domain) {
    return page.domain;
  }

  return `聯調來源${index + 1}`;
}

/**
 * 规范化网页记录为通话记录
 */
export function normalizeWebpageRecords(webpages: ApiWebpageRecord[]): CallRecord[] {
  return webpages.map((page, index) => {
    const phoneNumber = buildDialNumberFromSource(page.domain || page.url || '', index);
    const callStatus = deriveCallStatus(page.metadata?.statusCode, index);
    const sourceLabel = extractSourceLabel(page, index);
    const panelKey = sourceLabel || '聯調版';
    const durationSeed =
      page.content?.length ||
      page.htmlContent?.length ||
      (page.metadata?.statusCode ?? 200) * 5;
    const duration = Math.max(30, Math.min(1200, Math.round(durationSeed / 6)));
    const callTimeSource = page.capturedAt || page.createdAt || page.updatedAt;

    return {
      id: page.id ? `integration-${page.id}` : `integration-${index}`,
      calledNumber: phoneNumber,
      agent: (index % 20) + 1,
      note: page.title || page.metadata?.description || page.url || '未提供內容',
      callStatus,
      duration,
      recordingUrl: page.url,
      callTime: callTimeSource ? new Date(callTimeSource) : new Date(),
      panel: panelKey,
      integrationSource: panelKey,
      transcript: page.content
        ? {
            chinese: page.content.slice(0, 400),
            isTranslated: false
          }
        : undefined
    };
  });
}

/**
 * 合并监控摘要
 */
export function mergeSummaries(a: any, b: any): any {
  const mergeRate = (
    valueA?: number,
    samplesA: number = valueA !== undefined ? 1 : 0,
    valueB?: number,
    samplesB: number = valueB !== undefined ? 1 : 0
  ) => {
    const totalSamples = (valueA !== undefined ? samplesA : 0) + (valueB !== undefined ? samplesB : 0);
    if (totalSamples === 0) {
      return { value: undefined, count: 0 };
    }
    const total =
      (valueA !== undefined ? valueA * samplesA : 0) + (valueB !== undefined ? valueB * samplesB : 0);
    return {
      value: total / totalSamples,
      count: totalSamples
    };
  };

  const connectRate = mergeRate(
    a.connectRate,
    a.connectRateSamples,
    b.connectRate,
    b.connectRateSamples
  );
  const callbackRate = mergeRate(
    a.callbackRate,
    a.callbackRateSamples,
    b.callbackRate,
    b.callbackRateSamples
  );

  return {
    manualCalls: a.manualCalls + b.manualCalls,
    segmentCounts: {
      segment1: a.segmentCounts.segment1 + b.segmentCounts.segment1,
      segment2: a.segmentCounts.segment2 + b.segmentCounts.segment2,
      segment3: a.segmentCounts.segment3 + b.segmentCounts.segment3,
      segment4: a.segmentCounts.segment4 + b.segmentCounts.segment4
    },
    voiceCallCount: (a.voiceCallCount || 0) + (b.voiceCallCount || 0),
    connectRate: connectRate.value,
    callbackRate: callbackRate.value,
    connectRateSamples: connectRate.count,
    callbackRateSamples: callbackRate.count
  };
}

/**
 * 解析网页条目
 */
export function parseWebpageEntries(webpages: ApiWebpageRecord[]): MonitorSourceData[] {
  const bySource = new Map<string, MonitorSourceData>();

  webpages.forEach((page, index) => {
    const url = page.url || '';
    const recordType = page.recordType;
    const isCallPage =
      recordType === 'get_curcall_in' || TARGET_CALL_PAGE_REGEX.test(url);
    const isPeerStatusPage =
      recordType === 'get_peer_status' || TARGET_PEER_STATUS_REGEX.test(url);
    const isCampaignControllerPage =
      recordType === 'cont_controler' || TARGET_CAMPAIGN_CONTROLLER_REGEX.test(url);

    if (!isCallPage && !isPeerStatusPage && !isCampaignControllerPage) {
      return;
    }

    const html = page.content || page.htmlContent || '';
    if (!html) {
      return;
    }

    const hasTable = (isCallPage || isCampaignControllerPage) && html.includes('<table');
    const peerSeatRows = parsePeerStatusHtml(html);

    if (!hasTable && !peerSeatRows) {
      return;
    }

    const { calls, summary } = (() => {
      if (isCallPage && hasTable) {
        return parseCallTable(html);
      }
      if (isCampaignControllerPage && hasTable) {
        return parseCampaignControllerTable(html);
      }
      return {
        calls: [],
        summary: createEmptyMonitorSummary()
      };
    })();

    const rateSummary = extractCampaignRates(html);
    if (typeof rateSummary.connectRate === 'number') {
      summary.connectRate = rateSummary.connectRate;
      summary.connectRateSamples = rateSummary.connectRateSamples;
    }
    if (typeof rateSummary.callbackRate === 'number') {
      summary.callbackRate = rateSummary.callbackRate;
      summary.callbackRateSamples = rateSummary.callbackRateSamples;
    }

    const source = extractSourceLabel(page, index);
    const capturedAt = page.capturedAt || page.createdAt || page.updatedAt;

    if (bySource.has(source)) {
      const existing = bySource.get(source)!;
      existing.calls.push(...calls);
      existing.summary = mergeSummaries(existing.summary, summary);
      if (!existing.capturedAt && capturedAt) {
        existing.capturedAt = capturedAt;
      }
      if (peerSeatRows) {
        existing.seatStatuses = peerSeatRows;
      }
    } else {
      bySource.set(source, {
        source,
        capturedAt,
        calls: [...calls],
        summary,
        seatStatuses: peerSeatRows ?? undefined
      });
    }
  });

  return Array.from(bySource.values());
}
