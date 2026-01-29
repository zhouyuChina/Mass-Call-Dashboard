import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Activity, 
  Phone, 
  Clock, 
  TrendingUp, 
  CheckCircle, 
  Globe,
  MapPin,
  Wifi,
  Timer,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  User,
  Edit2,
  Download,
  Search,
  LogOut,
  RefreshCw,
  AlertTriangle,
  X
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogClose } from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { toast } from 'sonner@2.0.3';
import { safeToast } from '../utils/safeToast';
import { DataSourceSettings, DataState } from '../App';
import { io } from 'socket.io-client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://47.237.31.83:7000/api';
const CALL_RECORDS_URL = `${API_BASE_URL}/call-records`;
const CALL_RECORDS_LATEST_URL = `${CALL_RECORDS_URL}/latest`;
const WEBSOCKET_URL = API_BASE_URL.replace(/\/api\/?$/, '/ws');
const INITIAL_SEAT_COUNT = 20;
const SEATS_PER_ROW = 10;
const DEFAULT_TOTAL_SEATS = INITIAL_SEAT_COUNT;

function chunkSeatNumbers(numbers: number[], perRow: number = SEATS_PER_ROW): number[][] {
  const rows: number[][] = [];
  for (let i = 0; i < numbers.length; i += perRow) {
    rows.push(numbers.slice(i, i + perRow));
  }
  return rows;
}

function chunkPeerSeatRow(row: PeerSeatStatus[], perRow: number = SEATS_PER_ROW): PeerSeatStatusRow[] {
  const rows: PeerSeatStatusRow[] = [];
  for (let i = 0; i < row.length; i += perRow) {
    rows.push(row.slice(i, i + perRow));
  }
  return rows;
}

interface MonitorSummary {
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

type SeatStatusType = 'online' | 'offline' | 'ringing' | 'inCall' | 'disconnected';

type PeerSeatColor = 'green' | 'red' | 'purple' | 'blue' | 'grey';

interface PeerSeatStatus {
  seatNumber: number;
  status: SeatStatusType;
}

type PeerSeatStatusRow = PeerSeatStatus[];

// 通话记录接口
interface CallRecord {
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

function normalizeWebpageRecords(webpages: ApiWebpageRecord[]): CallRecord[] {
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

function normalizeAgentNames(saved: string[] | null, defaults: string[]): string[] {
  const baseLength = Math.max(DEFAULT_TOTAL_SEATS, defaults.length, saved?.length ?? 0);
  const result = Array.from({ length: baseLength }, (_, index) => {
    return defaults[index] ?? `座席${(index + 1).toString().padStart(2, '0')}`;
  });

  if (Array.isArray(saved)) {
    saved.forEach((name, index) => {
      if (index < result.length && typeof name === 'string' && name.trim() !== '') {
        result[index] = name;
      }
    });
  }

  return result;
}

function getSeatDisplayLabel(seatNumber: number): string {
  return seatNumber.toString().padStart(2, '0');
}

function deriveCallStatus(statusCode?: number, index: number = 0): CallRecord['callStatus'] {
  if (statusCode && statusCode >= 500) {
    return '通話中';
  }
  if (statusCode && statusCode >= 400) {
    return '轉座席';
  }
  return index % 4 === 0 ? '通話中' : '主打撥打';
}

function buildDialNumberFromSource(source: string, seed: number): string {
  const digitsOnly = source.replace(/\D/g, '');
  if (digitsOnly.length >= 10) {
    return digitsOnly.slice(0, 10);
  }

  let numericSeed = digitsOnly;
  const fallback = `${Math.abs(hashString(source))}${seed}`;
  numericSeed += fallback;

  return numericSeed.slice(0, 10).padEnd(10, '0');
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function extractSourceLabel(page: ApiWebpageRecord, index: number): string {
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

function normalizeCalledNumber(value?: string): string {
  if (!value) return '-';
  const digits = value.replace(/\D/g, '');
  const withoutLeadingZero = digits.replace(/^0+/, '');
  if (withoutLeadingZero) return withoutLeadingZero;
  return digits || '-';
}

function deriveSeatFromCallback(callback?: string): number | undefined {
  if (!callback) return undefined;
  const digits = callback.replace(/\D/g, '');
  if (!digits) return undefined;
  const seatDigits = digits.slice(-2);
  const seat = Number.parseInt(seatDigits, 10);
  if (Number.isNaN(seat) || seat <= 0) {
    return undefined;
  }
  return seat;
}

function determineCallStatusDisplay(rawStatus: string): string {
  const text = rawStatus || '';
  if (/座席/i.test(text)) {
    return '通話中';
  }
  if (/振鈴/.test(text)) {
    return text || '振鈴中';
  }
  return text || '聯調通話';
}

function parseWebpageApiText(rawText: string): ApiWebpageRecord[] {
  if (!rawText) {
    return [];
  }


  try {
    const parsed = JSON.parse(rawText);
    if (Array.isArray(parsed?.data)) {
      return parsed.data;
    }
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (parsed?.data?.data && Array.isArray(parsed.data.data)) {
      return parsed.data.data;
    }
    if (parsed?.result && Array.isArray(parsed.result)) {
      return parsed.result;
    }
    if (parsed?.items && Array.isArray(parsed.items)) {
      return parsed.items;
    }
    return [];
  } catch (error) {
    console.error('❌ 無法解析 /api/webpage JSON，改以純文字處理', error);
    if (rawText.includes('<table')) {
      return [
        {
          id: 'webpage-fallback',
          url: 'http://integration.local/fallback',
          content: rawText,
          htmlContent: rawText,
          title: 'fallback'
        }
      ];
    }
    return [];
  }
}

function transformCallRecordEntryToWebpage(entry?: CallRecordApiEntry | null): ApiWebpageRecord | null {
  if (!entry) return null;
  const responseBody =
    entry.responseBody || entry.content || entry.htmlContent || entry.parsedData?.rawHtml;
  if (!responseBody) {
    return {
      id: entry.id,
      url: entry.url || `call-record://${entry.recordType ?? 'unknown'}/${entry.id}`,
      recordType: entry.recordType,
      metadata: {
        description: entry.recordType,
        statusCode: entry.statusCode,
        requestMethod: entry.metadata?.requestMethod
      },
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      capturedAt: entry.lastUpdateTime || entry.updatedAt || entry.createdAt
    };
  }

  return {
    id: entry.id,
    url: entry.url || `call-record://${entry.recordType ?? 'unknown'}/${entry.id}`,
    recordType: entry.recordType,
    content: responseBody,
    htmlContent: responseBody,
    metadata: {
      description: entry.recordType,
      statusCode: entry.statusCode,
      requestMethod: entry.metadata?.requestMethod
    },
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    capturedAt: entry.lastUpdateTime || entry.updatedAt || entry.createdAt
  };
}

function normalizeCallRecordPayload(payload: any): CallRecordApiEntry | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const id = payload.id || payload.recordId || payload._id;
  if (!id) return null;

  return {
    id,
    recordType: payload.recordType || payload.type,
    url: payload.url,
    content: payload.content,
    htmlContent: payload.htmlContent,
    responseBody: payload.responseBody,
    parsedData: payload.parsedData,
    statusCode: payload.statusCode,
    metadata: payload.metadata,
    createdAt: payload.createdAt || payload.timestamp,
    updatedAt: payload.updatedAt || payload.timestamp,
    lastUpdateTime: payload.lastUpdateTime || payload.timestamp
  };
}

async function fetchLatestCallRecordPage(recordType: string): Promise<ApiWebpageRecord | null> {
  try {
    const response = await fetch(`${CALL_RECORDS_LATEST_URL}/${recordType}`, {
      headers: {
        Accept: 'application/json'
      }
    });
    if (!response.ok) {
      return null;
    }
    const data: CallRecordApiEntry = await response.json();
    return transformCallRecordEntryToWebpage(data);
  } catch (error) {
    console.warn(`⚠️ 無法取得 ${recordType} 最新資料`, error);
    return null;
  }
}

const TARGET_CALL_PAGE_REGEX = /get_curcall_in\.php\?/i;
const TARGET_PEER_STATUS_REGEX = /get_peer_status\.php\?/i;
const TARGET_CAMPAIGN_CONTROLLER_REGEX = /cont_controler\.php\?/i;

function parseWebpageEntries(webpages: ApiWebpageRecord[]): MonitorSourceData[] {
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

function parseCallTable(tableHtml: string): { calls: MonitorCallRow[]; summary: MonitorSummary } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(tableHtml, 'text/html');
  const table = doc.querySelector('table');
  if (!table) {
    return {
      calls: [],
      summary: createEmptyMonitorSummary()
    };
  }

  const summaryText = table.querySelector('thead')?.textContent || '';
  const summary: MonitorSummary = {
    manualCalls: extractNumber(summaryText, /人工通話：\s*(\d+)/i),
    segmentCounts: {
      segment1: extractNumber(summaryText, /一段：\s*(\d+)/i),
      segment2: extractNumber(summaryText, /二段：\s*(\d+)/i),
      segment3: extractNumber(summaryText, /三段：\s*(\d+)/i),
      segment4: extractNumber(summaryText, /四段：\s*(\d+)/i)
    },
    voiceCallCount: extractNumber(summaryText, /語音通話[:：]?\s*(\d+)/i),
    connectRateSamples: 0,
    callbackRateSamples: 0
  };

  const headerLabels = Array.from(table.querySelectorAll('th')).map((th) => cleanText(th.textContent));
  const isCallDetailTable = headerLabels.some(
    (label) => label.includes('被叫') || label.includes('呼叫狀態') || label.includes('通话时长')
  );
  if (!isCallDetailTable) {
    return {
      calls: [],
      summary
    };
  }

  const rows = Array.from(table.querySelectorAll('tr'));
  const calls: MonitorCallRow[] = [];
  rows.forEach((row) => {
    const cells = Array.from(row.querySelectorAll('td'));
    if (cells.length <= 1) {
      return;
    }
    const rowText = cleanText(row.textContent);
    if (!rowText || rowText.includes('無任何通話記錄')) {
      return;
    }
    const calledNumberRaw = cleanText(cells[1]?.textContent || '');
    const callbackRaw = cleanText(cells[2]?.textContent || '');
    const callStatusRaw = cleanText(cells[3]?.textContent || '');
    const normalizedStatus = determineCallStatusDisplay(callStatusRaw);

    calls.push({
      sequence: Number.parseInt(cleanText(cells[0]?.textContent || ''), 10) || undefined,
      calledNumber: normalizeCalledNumber(calledNumberRaw),
      callbackNumber: callbackRaw,
      callStatus: normalizedStatus,
      startTime: cleanText(cells[4]?.textContent || ''),
      durationText: cleanText(cells[5]?.textContent || ''),
      rawHtml: row.innerHTML,
      derivedAgent: deriveSeatFromCallback(callbackRaw)
    });
  });

  return {
    calls,
    summary
  };
}

function parseCampaignControllerTable(tableHtml: string): { calls: MonitorCallRow[]; summary: MonitorSummary } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(tableHtml, 'text/html');
  const table = doc.querySelector('table');
  if (!table) {
    return {
      calls: [],
      summary: createEmptyMonitorSummary()
    };
  }

  const rows = Array.from(table.querySelectorAll('tr')).filter((row) => row.querySelectorAll('td').length > 0);
  const connectValues: number[] = [];
  const callbackValues: number[] = [];

  rows.forEach((row) => {
    const cells = Array.from(row.querySelectorAll('td'));
    if (cells.length < 7) return;
    const connectCell = cells[6];
    const textContent = connectCell?.textContent || '';
    const connectMatch = textContent.match(/接通\s*[：:]\s*([\d.]+)/i);
    const callbackMatch = textContent.match(/回撥\s*[：:]\s*([\d.]+)/i);
    if (connectMatch) {
      const value = Number.parseFloat(connectMatch[1]);
      if (!Number.isNaN(value)) {
        connectValues.push(value);
      }
    }
    if (callbackMatch) {
      const value = Number.parseFloat(callbackMatch[1]);
      if (!Number.isNaN(value)) {
        callbackValues.push(value);
      }
    }
  });

  const summary = createEmptyMonitorSummary();
  if (connectValues.length > 0) {
    summary.connectRate = calculateAverage(connectValues);
    summary.connectRateSamples = connectValues.length;
  }
  if (callbackValues.length > 0) {
    summary.callbackRate = calculateAverage(callbackValues);
    summary.callbackRateSamples = callbackValues.length;
  }

  return {
    calls: [],
    summary
  };
}

function parsePeerStatusHtml(html: string): PeerSeatStatusRow[] | null {
  if (!html) return null;
  // 檢查是否包含座席狀態相關的內容，包括 get_curcall_in
  if (!/綠色-待機|紅色-離線|get_peer_status|get_curcall_in/i.test(html)) {
    return null;
  }

  const sanitized = html
    .replace(/<\/br>/gi, '<br/>')
    .replace(/<br\s*\/?>/gi, '<br/>');
  const parser = new DOMParser();
  const doc = parser.parseFromString(sanitized, 'text/html');
  const [firstSection] = doc.body.innerHTML.split(/<br\s*\/?>\s*<br\s*\/?>/i);
  const targetSection = firstSection || doc.body.innerHTML;

  const segments = targetSection
    .split(/<br\s*\/?>/i)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0 && !segment.includes('綠色-待機'));

  const fontRegex = /<font[^>]*color=['"]?(green|red|purple|blue|grey)['"]?[^>]*>\s*([0-9]{1,3})\s*<\/font>/gi;
  // 檢查所有段，找到包含座席號碼的段
  let targetSegment: string | null = null;
  for (const segment of segments) {
    if (fontRegex.test(segment)) {
      targetSegment = segment;
      break;
    }
  }
  
  if (!targetSegment) {
    return null;
  }

  fontRegex.lastIndex = 0;
  const seats: PeerSeatStatus[] = [];
  let match: RegExpExecArray | null;
  while ((match = fontRegex.exec(targetSegment)) !== null) {
    const seatNumber = Number.parseInt(match[2], 10);
    if (Number.isNaN(seatNumber)) continue;
    seats.push({
      seatNumber,
      status: mapPeerColorToStatus(match[1] as PeerSeatColor)
    });
  }

  if (seats.length === 0) {
    return null;
  }

  return chunkPeerSeatRow(seats, SEATS_PER_ROW);
}

function mapPeerColorToStatus(color: PeerSeatColor): SeatStatusType {
  switch (color.toLowerCase()) {
    case 'green':
      return 'online';
    case 'purple':
      return 'ringing';
    case 'blue':
      return 'inCall';
    case 'grey':
      return 'disconnected';
    default:
      return 'offline';
  }
}

function extractCampaignRates(tableHtml: string): Pick<
  MonitorSummary,
  'connectRate' | 'callbackRate' | 'connectRateSamples' | 'callbackRateSamples'
> {
  if (!tableHtml) {
    return {};
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(tableHtml, 'text/html');
  const textContent = doc.body?.textContent || '';
  if (!textContent) {
    return {};
  }
  const normalized = textContent.replace(/\s+/g, ' ');
  const connectValues = extractPercentageValues(normalized, '接通');
  const callbackValues = extractPercentageValues(normalized, '回撥');
  return {
    connectRate: calculateAverage(connectValues),
    callbackRate: calculateAverage(callbackValues),
    connectRateSamples: connectValues.length,
    callbackRateSamples: callbackValues.length
  };
}

function extractPercentageValues(text: string, label: string): number[] {
  const regex = new RegExp(`${label}\\s*[:：]\\s*([\\d.]+)\\s*%`, 'gi');
  const values: number[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const value = Number.parseFloat(match[1]);
    if (!Number.isNaN(value)) {
      values.push(value);
    }
  }
  return values;
}

function calculateAverage(values: number[]): number | undefined {
  if (!values.length) return undefined;
  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

function createEmptyMonitorSummary(): MonitorSummary {
  return {
    manualCalls: 0,
    segmentCounts: {
      segment1: 0,
      segment2: 0,
      segment3: 0,
      segment4: 0
    },
    voiceCallCount: 0,
    connectRate: undefined,
    callbackRate: undefined,
    connectRateSamples: 0,
    callbackRateSamples: 0
  };
}

function extractNumber(text: string, pattern: RegExp): number {
  const match = text.match(pattern);
  return match ? Number.parseInt(match[1], 10) || 0 : 0;
}

function cleanText(value?: string | null): string {
  if (!value) return '';
  return value.replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function mergeSummaries(a: MonitorSummary, b: MonitorSummary): MonitorSummary {
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
    voiceCallCount: (a.voiceCallCount ?? 0) + (b.voiceCallCount ?? 0),
    connectRate: connectRate.value,
    callbackRate: callbackRate.value,
    connectRateSamples: connectRate.count,
    callbackRateSamples: callbackRate.count
  };
}

function mergeRate(
  valueA?: number,
  samplesA: number = valueA !== undefined ? 1 : 0,
  valueB?: number,
  samplesB: number = valueB !== undefined ? 1 : 0
): { value?: number; count: number } {
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
}

function convertSourceEntriesToRecords(entries: MonitorSourceData[]): CallRecord[] {
  const records: CallRecord[] = [];

  entries.forEach((entry) => {
    entry.calls.forEach((call, index) => {
      const agent =
        call.derivedAgent ??
        extractAgentNumberFromStatus(call.callStatus, (index % 20) + 1);
      const durationSeconds = parseDurationToSeconds(call.durationText);
      const callTime =
        call.startTime ? parseMonitorDate(call.startTime) : entry.capturedAt ? new Date(entry.capturedAt) : new Date();
      const calledNumber = call.calledNumber || '-';
      const callbackNumber = call.callbackNumber ? call.callbackNumber.replace(/\s+/g, '') : undefined;

      records.push({
        id: `webpage-${entry.source}-${call.sequence ?? index}-${records.length}`,
        calledNumber,
        callbackNumber,
        agent,
        note: call.callStatus || '聯調通話',
        callStatus: call.callStatus || '聯調通話',
        duration: durationSeconds,
        recordingUrl: '',
        callTime,
        panel: entry.source,
        integrationSource: entry.source
      });
    });
  });

  return records.sort((a, b) => b.callTime.getTime() - a.callTime.getTime());
}

function parseDurationToSeconds(text?: string): number {
  if (!text) return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;

  if (trimmed.includes(':')) {
    const parts = trimmed.split(':').map((part) => Number.parseInt(part, 10) || 0);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
  }

  let total = 0;
  const hourMatch = trimmed.match(/(\d+)\s*(小時|小时|h)/i);
  if (hourMatch) {
    total += Number.parseInt(hourMatch[1], 10) * 3600;
  }
  const minuteMatch = trimmed.match(/(\d+)\s*(分|分鐘|分钟|m)/i);
  if (minuteMatch) {
    total += Number.parseInt(minuteMatch[1], 10) * 60;
  }
  const secondMatch = trimmed.match(/(\d+)\s*(秒|s)/i);
  if (secondMatch) {
    total += Number.parseInt(secondMatch[1], 10);
  }
  return total;
}

function parseMonitorDate(text?: string): Date {
  if (!text) return new Date();
  const normalized = text.replace(/\//g, '-');
  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }
  return new Date();
}

function extractAgentNumberFromStatus(status: string, fallback: number): number {
  if (!status) return fallback;
  const seatMatch = status.match(/座席\s*(\d+)/i);
  if (seatMatch) {
    return Number.parseInt(seatMatch[1], 10) || fallback;
  }
  const numberMatch = status.match(/(\d+)/);
  if (numberMatch) {
    return Number.parseInt(numberMatch[1], 10) || fallback;
  }
  return fallback;
}

function getCallStatusBadgeClass(status: string): string {
  if (!status) return 'bg-gray-100 text-gray-800';
  if (status.includes('振鈴')) return 'bg-purple-100 text-purple-800';
  if (status.includes('主打撥打')) return 'bg-green-100 text-green-800';
  if (status.includes('轉座席') || status.includes('回撥')) return 'bg-orange-100 text-orange-800';
  if (status.includes('通話') || status.includes('一段') || status.includes('二段')) return 'bg-blue-100 text-blue-800';
  return 'bg-gray-100 text-gray-800';
}

function formatPercentage(value: number): string {
  if (!Number.isFinite(value)) return '-';
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(1)}%`;
}

function buildIntegrationAgentStats(
  records: CallRecord[],
  hasData: boolean,
  totalSeats: number = DEFAULT_TOTAL_SEATS
): AgentDisplayState[] {
  interface RawAgentStats {
    answered: number;
    hungUp: number;
    totalDuration: number;
    maxDuration: number;
    maxCallNumber: string;
    inCall: boolean;
    ringing: boolean;
  }

  const statsByAgent = new Map<number, RawAgentStats>();
  records.forEach((record) => {
    const current = statsByAgent.get(record.agent) || {
      answered: 0,
      hungUp: 0,
      totalDuration: 0,
      maxDuration: 0,
      maxCallNumber: record.calledNumber,
      inCall: false,
      ringing: false
    };

    current.answered += 1;
    current.totalDuration += record.duration;
    if (record.callStatus === '轉座席') {
      current.hungUp += 1;
    }
    if (record.callStatus === '通話中') {
      current.inCall = true;
    }
    if (record.callStatus.includes('振鈴')) {
      current.ringing = true;
    }
    if (record.duration > current.maxDuration) {
      current.maxDuration = record.duration;
      current.maxCallNumber = record.calledNumber;
    }

    statsByAgent.set(record.agent, current);
  });

  const maxSeatFromRecords = records.reduce((max, record) => Math.max(max, record.agent), 0);
  const seatCount = Math.max(totalSeats, maxSeatFromRecords);

  return Array.from({ length: seatCount }, (_, index) => {
    const seatNumber = index + 1;
    const stats = statsByAgent.get(seatNumber);

    if (!stats) {
      if (!hasData) {
        return {
          seatNumber,
          status: 'noData',
          stats: {
            answered: 0,
            hungUp: 0,
            avgDuration: 0,
            maxDuration: 0,
            maxCallNumber: '-',
            onlineTime: 0
          }
        };
      }
      return {
        seatNumber,
        status: 'offline',
        stats: {
          answered: 0,
          hungUp: 0,
          avgDuration: 0,
          maxDuration: 0,
          maxCallNumber: '-',
          onlineTime: 0
        }
      };
    }

    const avgDuration = stats.answered > 0 ? Math.floor(stats.totalDuration / stats.answered) : 0;
    const onlineTime = Math.max(60, stats.answered * 12);

    const status: AgentDisplayState['status'] =
      stats.inCall ? 'inCall' : stats.ringing ? 'ringing' : 'online';

    return {
      seatNumber,
      status,
      stats: {
        answered: stats.answered,
        hungUp: stats.hungUp,
        avgDuration,
        maxDuration: stats.maxDuration,
        maxCallNumber: stats.maxCallNumber,
        onlineTime
      }
    };
  });
}

interface OverviewStats {
  totalWebpages: number;
  totalDomains: number;
  todayCount: number;
  weekCount: number;
  averagePerDay: number;
}

interface DomainAnalysisItem {
  domain: string;
  count: number;
  percentage: number;
}

interface DomainAnalysisResponse {
  domains: DomainAnalysisItem[];
}

interface TimeSeriesEntry {
  date: string;
  count: number;
}

interface ApiWebpageRecord {
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
  };
  sourcePluginId?: string;
  browserType?: string;
  createdAt?: string;
  updatedAt?: string;
  capturedAt?: string;
}

interface CallRecordApiEntry {
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

interface CallRecordsApiResponse {
  data?: CallRecordApiEntry[];
}

interface WebpageApiResponse {
  data: ApiWebpageRecord[];
}

interface IntegrationPanelState {
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

interface AgentDisplayState {
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

interface RealtimePanelProps {
  isConnected?: boolean;
  onConnect?: (connected: boolean) => void;
  dataSourceSettings: DataSourceSettings;
  dataState?: DataState;
}

interface MonitorCallRow {
  sequence?: number;
  calledNumber: string;
  callbackNumber?: string;
  callStatus: string;
  startTime?: string;
  durationText?: string;
  rawHtml?: string;
  derivedAgent?: number;
}

interface MonitorSourceData {
  source: string;
  capturedAt?: string;
  calls: MonitorCallRow[];
  summary: MonitorSummary;
  seatStatuses?: PeerSeatStatusRow[];
}

export function RealtimePanel({ 
  isConnected = false, 
  onConnect, 
  dataSourceSettings,
  dataState = 'normal'
}: RealtimePanelProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isDisconnectDialogOpen, setIsDisconnectDialogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<number | null>(null); // 選中的座席號，null表示全部
  const [selectedPanel, setSelectedPanel] = useState<'A' | string>('A'); // 面板選擇狀態，預設選中展示用面板
  const [callSearchQuery, setCallSearchQuery] = useState(''); // 通話記錄搜索關鍵字
  const [durationFilter, setDurationFilter] = useState<number>(0); // 通話時長篩選（分鐘數），0表示全部
  const [callStatusFilter, setCallStatusFilter] = useState<string>('all'); // 呼叫狀態篩選，'all'表示全部
  const [expandedCallRecords, setExpandedCallRecords] = useState<Set<string>>(new Set()); // 展開的通話記錄ID
  const [integrationState, setIntegrationState] = useState<IntegrationPanelState>({
    status: 'idle',
    error: null,
    overview: null,
    domainAnalysis: null,
    timeSeries: [],
    records: [],
    lastSyncedAt: null,
    sources: [],
    monitorSummaries: {},
    seatStatuses: {}
  });
  
  // 座席姓名管理
  const defaultAgentNames = ['王大明', '李小美', 'Jack', '陳小華', '林志強', 'Mary', '張偉', 'Tom', '劉芳', 'Amy', 
                             '黃建國', 'David', '周敏', 'Lisa', '吳文昌', 'Peter', '鄭雅婷', 'Emma', '孫偉'];
  const [agentNames, setAgentNames] = useState<string[]>(() => {
    const saved = localStorage.getItem('agentNames');
    const parsed = saved ? JSON.parse(saved) : null;
    return normalizeAgentNames(parsed, defaultAgentNames);
  });
  const totalSeatCount = Math.max(agentNames.length, DEFAULT_TOTAL_SEATS);
  const defaultSeatNumbers = useMemo(
    () => Array.from({ length: totalSeatCount }, (_, idx) => idx + 1),
    [totalSeatCount]
  );
  const seatGridStyle = useMemo(
    () => ({
      gridTemplateColumns: 'repeat(auto-fill, minmax(4rem, 4rem))'
    }),
    []
  );
  const SEATS_PER_ROW = 5;
  const SEAT_EDITOR_WIDTH = 100;
  const SEAT_EDITOR_GAP = 12; // gap-3
  const SEAT_EDITOR_HORIZONTAL_PADDING = 48; // px-6 左右，共 48px
  const agentNameGridStyle = useMemo(
    () => ({
      gridTemplateColumns: `repeat(${SEATS_PER_ROW}, ${SEAT_EDITOR_WIDTH}px)`,
      width: 'fit-content'
    }),
    []
  );
  const agentDialogWidth = useMemo(
    () => SEATS_PER_ROW * SEAT_EDITOR_WIDTH + (SEATS_PER_ROW - 1) * SEAT_EDITOR_GAP + SEAT_EDITOR_HORIZONTAL_PADDING,
    []
  );
  const getAgentDisplayName = useCallback(
    (seatNumber: number) => agentNames[seatNumber - 1] || `座席${seatNumber.toString().padStart(2, '0')}`,
    [agentNames]
  );
  const [isAgentNamesDialogOpen, setIsAgentNamesDialogOpen] = useState(false);
  const [tempAgentNames, setTempAgentNames] = useState<string[]>(agentNames);
  const [seatToDelete, setSeatToDelete] = useState<number | null>(null);
  const [isDeleteSeatDialogOpen, setIsDeleteSeatDialogOpen] = useState(false);
  const integrationSources = integrationState.sources.length > 0 ? integrationState.sources : ['聯調版'];
  const isIntegrationPanelSelected =
    selectedPanel !== 'A' &&
    integrationSources.includes(selectedPanel);
  const [callRecords, setCallRecords] = useState<CallRecord[]>([]);
  const callRecordStoreRef = useRef<Map<string, CallRecord>>(new Map());
  const socketRef = useRef<ReturnType<typeof io> | null>(null);
  const websocketRecordsRef = useRef<Map<string, ApiWebpageRecord>>(new Map());
  const rebuildIntegrationState = useCallback(
    (syncedAt?: Date) => {
      const webpages = Array.from(websocketRecordsRef.current.values());
      if (webpages.length === 0) {
        setIntegrationState((prev) => ({
          ...prev,
          status: 'idle',
          records: [],
          sources: [],
          monitorSummaries: {},
          seatStatuses: {},
          overview: null,
          domainAnalysis: null,
          timeSeries: [],
          lastSyncedAt: syncedAt ?? prev.lastSyncedAt,
          error: null
        }));
        return;
      }

      const parsedEntries = parseWebpageEntries(webpages);
      const normalizedRecords = convertSourceEntriesToRecords(parsedEntries);
      const summaries = parsedEntries.reduce<Record<string, MonitorSummary | undefined>>((acc, entry) => {
        acc[entry.source] = entry.summary;
        return acc;
      }, {});
      const seatStatuses = parsedEntries.reduce<Record<string, PeerSeatStatusRow[] | undefined>>((acc, entry) => {
        acc[entry.source] = entry.seatStatuses;
        return acc;
      }, {});
      const sources = parsedEntries.map((entry) => entry.source);

      setIntegrationState({
        status: 'success',
        error: null,
        overview: null,
        domainAnalysis: null,
        timeSeries: [],
        records: normalizedRecords,
        lastSyncedAt: syncedAt ?? new Date(),
        sources,
        monitorSummaries: summaries,
        seatStatuses
      });
    },
    [setIntegrationState]
  );
  const upsertWebsocketRecord = useCallback(
    (entry: CallRecordApiEntry, syncedAt?: Date) => {
      const page = transformCallRecordEntryToWebpage(entry);
      if (!page) return;
      const key = entry.id || page.url;
      if (!key) return;
      websocketRecordsRef.current.set(key, page);
      rebuildIntegrationState(syncedAt);
    },
    [rebuildIntegrationState]
  );
  const handleCallRecordEventPayload = useCallback(
    (payload: any) => {
      const normalized = normalizeCallRecordPayload(payload);
      if (normalized) {
        upsertWebsocketRecord(normalized, new Date());
      }
    },
    [upsertWebsocketRecord]
  );
  const handleCallStatusChangedEvent = useCallback(
    (payload: any) => {
      if (!payload) return;
      const normalized = normalizeCallRecordPayload(payload.record || payload);
      if (normalized) {
        upsertWebsocketRecord(normalized, new Date());
        return;
      }
      if (payload.id) {
        const existing = websocketRecordsRef.current.get(payload.id);
        if (existing) {
          websocketRecordsRef.current.set(payload.id, {
            ...existing,
            metadata: {
              ...existing.metadata,
              status: payload.status || payload.state || 'ended'
            }
          });
          rebuildIntegrationState(new Date());
        }
      }
    },
    [rebuildIntegrationState, upsertWebsocketRecord]
  );

  const fetchIntegrationData = useCallback(async () => {
    setIntegrationState((prev) => ({
      ...prev,
      status: 'loading',
      error: null
    }));

    try {
      const url = new URL(CALL_RECORDS_URL);
      url.searchParams.set('page', '1');
      url.searchParams.set('limit', '20');
      url.searchParams.set('recordType', 'get_curcall_in');
      const response = await fetch(url.toString(), {
        headers: {
          Accept: 'application/json'
        }
      });

      if (!response.ok) throw new Error('無法取得通話記錄資料');

      const listJson: CallRecordsApiResponse = await response.json();
      const recordEntries = Array.isArray(listJson?.data) ? listJson.data : [];
      const baseWebpages = recordEntries
        .map(transformCallRecordEntryToWebpage)
        .filter((entry): entry is ApiWebpageRecord => entry !== null);

      const [peerStatusPage, contControllerPage] = await Promise.all([
        fetchLatestCallRecordPage('get_peer_status'),
        fetchLatestCallRecordPage('cont_controler')
      ]);

      const webpages = [
        ...baseWebpages,
        ...(peerStatusPage ? [peerStatusPage] : []),
        ...(contControllerPage ? [contControllerPage] : [])
      ];

      const recordMap = new Map<string, ApiWebpageRecord>();
      webpages.forEach((page, index) => {
        const key = page.id || page.url || `record-${index}`;
        recordMap.set(key, page);
      });
      websocketRecordsRef.current = recordMap;
      rebuildIntegrationState(new Date());
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知錯誤';
      console.error('❌ 聯調資料同步失敗:', message);
      setIntegrationState((prev) => ({
        ...prev,
        status: 'error',
        error: message
      }));
      safeToast.error('聯調資料同步失敗', message);
    }
  }, [rebuildIntegrationState]);

  // TODO: 通话时长数据将通过 WebSocket 获取，暂时使用空状态
  const isCallDurationLoading = false;
  const callDurationLastSyncedAt: Date | null = null;

  useEffect(() => {
    if (integrationState.status !== 'success' || integrationState.records.length === 0) {
      if (integrationState.status === 'success' && integrationState.records.length === 0) {
        const store = new Map(callRecordStoreRef.current);
        store.forEach((record, key) => {
          if (record.integrationSource) {
            store.set(key, {
              ...record,
              callStatus: '通話結束',
              note: '通話結束'
            });
          }
        });
        callRecordStoreRef.current = store;
        setCallRecords(Array.from(store.values()));
      }
      return;
    }

    const primarySource = integrationState.sources[0];
    if (!primarySource) return;

    const latestRecords = integrationState.records.filter(
      (record) => record.integrationSource === primarySource
    );

  const store = new Map(callRecordStoreRef.current);
  const updatedKeys = new Set<string>();

  latestRecords.forEach((record) => {
    if (!record.calledNumber) return;
    const existing = store.get(record.calledNumber);
    store.set(record.calledNumber, {
      id: record.id ?? existing?.id ?? `integration-${record.calledNumber}`,
      calledNumber: record.calledNumber,
      agent: record.agent,
      note: record.note || record.callStatus || existing?.note || '通話中',
      callStatus: record.callStatus || existing?.callStatus || '通話中',
      duration: record.duration ?? existing?.duration ?? 0,
      recordingUrl: record.recordingUrl || existing?.recordingUrl || '',
      callTime: record.callTime || existing?.callTime || new Date(),
      panel: 'A',
      integrationSource: primarySource
    });
    updatedKeys.add(record.calledNumber);
  });

  store.forEach((record, key) => {
    if (!updatedKeys.has(key) && record.integrationSource === primarySource) {
      store.set(key, {
        ...record,
        callStatus: '通話結束',
        note: '通話結束'
      });
    }
  });

  callRecordStoreRef.current = store;
  setCallRecords(Array.from(store.values()));
  }, [integrationState.records, integrationState.sources, integrationState.status]);

  const baseCallStatusOptions = useMemo(
    () => Array.from(new Set(callRecords.map((record) => record.callStatus))),
    [callRecords]
  );
  const availableCallStatuses = useMemo(() => {
    const statuses = new Set(baseCallStatusOptions);
    integrationState.records.forEach((record) => {
      if (record.callStatus) {
        statuses.add(record.callStatus);
      }
    });
    return Array.from(statuses);
  }, [baseCallStatusOptions, integrationState.records]);

  // 格式化通话时长（秒转为分:秒）
  const formatCallDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 根据选中的座席筛选通话记录
  const getFilteredCallRecords = (
    records: CallRecord[],
    restrictToPanelA: boolean = true,
    dedupeByNumber: boolean = true
  ): CallRecord[] => {
    let filtered = records;
    
    if (restrictToPanelA) {
      filtered = filtered.filter(record => record.panel === 'A');
    }
    
    // 按座席筛选
    if (selectedAgent !== null) {
      filtered = filtered.filter(record => record.agent === selectedAgent);
    }
    
    // 按搜索关键字筛选（搜索被叫号码和备注）
    if (callSearchQuery.trim()) {
      const query = callSearchQuery.trim().toLowerCase();
      filtered = filtered.filter(record => 
        record.calledNumber.includes(query) || 
        record.note.toLowerCase().includes(query)
      );
    }
    
    // 按通话时长筛选
    if (durationFilter > 0) {
      const minSeconds = durationFilter * 60; // 转换为秒
      filtered = filtered.filter(record => record.duration >= minSeconds);
    }
    
    // 按呼叫狀態篩選
    if (callStatusFilter !== 'all') {
      filtered = filtered.filter(record => record.callStatus === callStatusFilter);
    }
    
    if (dedupeByNumber) {
      const deduped = new Map<string, CallRecord>();
      filtered.forEach((record) => {
        const existing = deduped.get(record.calledNumber);
        if (!existing || record.duration >= existing.duration) {
          deduped.set(record.calledNumber, record);
        }
      });
      filtered = Array.from(deduped.values());
    }
    
    return filtered;
  };

  // 处理座席点击
  const handleAgentClick = (agentNumber: number) => {
    if (selectedAgent === agentNumber) {
      // 如果点击的是已选中的座席，取消选中
      setSelectedAgent(null);
    } else {
      // 选中新的座席
      setSelectedAgent(agentNumber);
    }
  };

  // 切換通話記錄展開狀態
  const toggleCallRecordExpansion = (recordId: string) => {
    const newExpanded = new Set(expandedCallRecords);
    if (newExpanded.has(recordId)) {
      newExpanded.delete(recordId);
    } else {
      newExpanded.add(recordId);
    }
    setExpandedCallRecords(newExpanded);
  };

  // 硬編碼的統計數據（用於UI顯示）
  const realtimeStats = {
    avgConnectRate: 48, // 接通率48%
    avgCallbackRate: 28  // 回撥率28%
  };

  // 實時更新時間
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (integrationState.status === 'idle') {
      fetchIntegrationData();
    }
  }, [integrationState.status, fetchIntegrationData]);

  useEffect(() => {
    const socket = io(WEBSOCKET_URL, {
      transports: ['websocket']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.info('✅ 聯調 WebSocket 已連線');
      socket.emit('subscribe:call-records');
    });

    socket.on('disconnect', () => {
      console.warn('⚠️ 聯調 WebSocket 已斷線');
    });

    socket.on('call-record:created', handleCallRecordEventPayload);
    socket.on('call-record:updated', handleCallRecordEventPayload);
    socket.on('call-status:changed', handleCallStatusChangedEvent);

    return () => {
      socket.emit('unsubscribe:call-records');
      socket.off('call-record:created', handleCallRecordEventPayload);
      socket.off('call-record:updated', handleCallRecordEventPayload);
      socket.off('call-status:changed', handleCallStatusChangedEvent);
      socketRef.current = null;
      socket.disconnect();
    };
  }, [handleCallRecordEventPayload, handleCallStatusChangedEvent]);

  useEffect(() => {
    if (
      selectedPanel !== 'A' &&
      integrationState.sources.length > 0 &&
      !integrationState.sources.includes(selectedPanel)
    ) {
      setSelectedPanel(integrationState.sources[0]);
    }
  }, [integrationState.sources, selectedPanel]);

  // 格式化電話號碼顯示為 XXXXX-XXXX 格式（例如：48122-3186）
  const formatPhoneNumber = (phoneNumber: string): string => {
    if (!phoneNumber) return '-';
    // 移除所有非數字字符
    const digits = phoneNumber.replace(/\D/g, '');
    // 如果是9位數字，格式化為前5位-後4位
    if (digits.length === 9) {
      return `${digits.substring(0, 5)}-${digits.substring(5, 9)}`;
    }
    // 如果是10位數字，格式化為前6位-後4位
    if (digits.length === 10) {
      return `${digits.substring(0, 6)}-${digits.substring(6, 10)}`;
    }
    // 其他長度，嘗試在倒數第4位前加入連字符
    if (digits.length > 4) {
      const splitPoint = digits.length - 4;
      return `${digits.substring(0, splitPoint)}-${digits.substring(splitPoint)}`;
    }
    return digits || phoneNumber; // 如果不足5位，直接返回數字或原號碼
  };

  const formatSyncTimestamp = (date: Date | null): string => {
    if (!date) return '尚未同步';
    return date.toLocaleTimeString([], {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatStartTime = (date?: Date): string => {
    if (!date || Number.isNaN(date.getTime())) return '-';
    return date.toLocaleTimeString([], {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // 打開座席姓名編輯對話框
  const handleOpenAgentNamesDialog = () => {
    setTempAgentNames([...agentNames]);
    setIsAgentNamesDialogOpen(true);
  };

  // 保存座席姓名
  const handleSaveAgentNames = () => {
    setAgentNames(tempAgentNames);
    localStorage.setItem('agentNames', JSON.stringify(tempAgentNames));
    setIsAgentNamesDialogOpen(false);
    safeToast.success('座席姓名已保存');
  };

  // 取消編輯座席姓名
  const handleCancelAgentNames = () => {
    setIsAgentNamesDialogOpen(false);
    setTempAgentNames([...agentNames]);
    setSeatToDelete(null);
    setIsDeleteSeatDialogOpen(false);
  };

  const handleRequestDeleteSeat = (seatNumber: number) => {
    setSeatToDelete(seatNumber);
    setIsDeleteSeatDialogOpen(true);
  };

  const handleConfirmDeleteSeat = () => {
    if (!seatToDelete) return;
    setTempAgentNames((prev) => {
      const newNames = [...prev];
      if (seatToDelete - 1 < newNames.length) {
        newNames.splice(seatToDelete - 1, 1);
      }
      return newNames;
    });
    setSeatToDelete(null);
    setIsDeleteSeatDialogOpen(false);
  };

  const handleCancelDeleteSeatDialog = () => {
    setSeatToDelete(null);
    setIsDeleteSeatDialogOpen(false);
  };

  // 登出系統
  const handleLogout = () => {
    // 清除所有本地存儲
    localStorage.clear();
    // 刷新頁面
    window.location.reload();
  };
  
  // 渲染人員狀態監控
  function renderStaffMonitor() {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                人員狀態監控
              </h3>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-gray-600">通話中：<span className="font-semibold text-gray-800">6人</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                  <span className="text-gray-600">振鈴中：<span className="font-semibold text-gray-800">0人</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-gray-600">上線中：<span className="font-semibold text-gray-800">12人</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-gray-600">離線：<span className="font-semibold text-gray-800">2人</span></span>
                </div>
              </div>
            </div>
          </div>
          <div className="p-4">
            <div className="space-y-2">
              {(() => {
                const inCall = [1, 3, 5, 8, 12, 15];
                const online = [2, 4, 6, 7, 9, 10, 11, 13, 14, 16, 17, 18];
                const offline = [19];
                
                const getAgentStats = (seatNumber: number) => {
                  if (offline.includes(seatNumber)) {
                    return {
                      answered: 0,
                      hungUp: 0,
                      avgDuration: 0,
                      maxDuration: 0,
                      maxCallNumber: '-',
                      onlineTime: 0
                    };
                  }
                  
                  const seed = seatNumber * 123;
                  return {
                    answered: Math.floor((seed % 50) + 10),
                    hungUp: Math.floor((seed % 20) + 5),
                    avgDuration: Math.floor((seed % 300) + 60),
                    maxDuration: Math.floor((seed % 900) + 300),
                    maxCallNumber: `+1-${Math.floor((seed % 900) + 100)}-${Math.floor((seed % 900) + 100)}-${Math.floor((seed % 9000) + 1000)}`,
                    onlineTime: Math.floor((seed % 400) + 60)
                  };
                };
                
                return (
                  <div className="grid gap-2 justify-start" style={seatGridStyle}>
                    {defaultSeatNumbers.map((seatNumber) => {
                  let bgColor = 'bg-red-500';
                  let statusText = '離線';
                  
                  if (inCall.includes(seatNumber)) {
                    bgColor = 'bg-blue-500';
                    statusText = '通話中';
                  } else if (online.includes(seatNumber)) {
                    bgColor = 'bg-green-500';
                    statusText = '上線中';
                  }
                  
                  const stats = getAgentStats(seatNumber);
                  const isSelected = selectedAgent === seatNumber;
                      const displayLabel = getSeatDisplayLabel(seatNumber);
                  
                  return (
                        <Tooltip key={`staff-seat-${seatNumber}`}>
                      <TooltipTrigger asChild>
                        <div 
                            className={`${bgColor} text-white rounded-lg p-2 text-center cursor-pointer hover:opacity-80 transition-all w-full h-16 flex flex-col items-center justify-center ${
                            isSelected ? 'ring-4 ring-yellow-400 ring-offset-2' : ''
                          }`}
                          onClick={() => handleAgentClick(seatNumber)}
                        >
                              <div className="font-semibold text-sm">{displayLabel}</div>
                              <div className="text-xs mt-1 opacity-90">{getAgentDisplayName(seatNumber)}</div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="p-3">
                        <div className="text-xs space-y-1">
                          <div className="font-semibold text-sm mb-2 border-b pb-1">座席 {seatNumber.toString().padStart(2, '0')} - {statusText}</div>
                          <div>接聽：<span className="font-medium">{stats.answered}</span> 通</div>
                          <div>掛掉：<span className="font-medium">{stats.hungUp}</span> 通</div>
                          <div>平均話時長：<span className="font-medium">{Math.floor(stats.avgDuration / 60)}分{stats.avgDuration % 60}秒</span></div>
                          <div>最長通話：<span className="font-medium">{Math.floor(stats.maxDuration / 60)}</span> 分鐘</div>
                              <div>最長通話號碼：<span className="font-medium">{formatPhoneNumber(stats.maxCallNumber)}</span></div>
                          <div>在線時間：<span className="font-medium">{Math.floor(stats.onlineTime / 60)}小時{stats.onlineTime % 60}分</span></div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
    );
  }
  
  // 渲染統計卡片
  function renderStatsOnly(panel: 'A') {
    return (
      <div className="flex gap-4">
        {/* 併發數 + 接聽語音包中 */}
        <div className="flex-1 bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-gray-600">併發數 / 接聽語音包中</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 mb-1">併發數</div>
              <div className="text-2xl font-bold text-blue-600">250 通</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500 mb-1">接聽語音包中</div>
              <div className="text-2xl font-bold text-purple-600">23 則</div>
            </div>
          </div>
        </div>

        {/* 接通回撥率 + 平均通話時長 */}
        <div className="flex-1 bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="text-sm text-gray-600">接通/回撥率 / 平均時長</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 mb-1">接通/回撥</div>
              <div className="text-lg font-bold text-green-600">
                接通：{realtimeStats.avgConnectRate}% 
                回撥：{realtimeStats.avgCallbackRate}%
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500 mb-1">平均時長</div>
              <div className="text-2xl font-bold text-cyan-600">
                {(() => {
                  const totalDuration = callRecords.reduce((sum, record) => sum + record.duration, 0);
                  const avgSeconds = callRecords.length > 0 ? Math.floor(totalDuration / callRecords.length) : 0;
                  return formatCallDuration(avgSeconds);
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* 長時間進行中的通話 */}
        <div className="flex-1 bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-orange-600" />
            <span className="text-sm text-gray-600">長時間進行中的通話</span>
          </div>
            <div className="text-xs text-gray-600 space-y-0.5">
              <div>座席03 | 703-597-2845 | 5分22秒</div>
              <div>座席08 | 617-700-4521 | 6分45秒</div>
              <div>座席15 | 253-202-8762 | 4分18秒</div>
            </div>
        </div>
      </div>
    );
  }

  // 渲染通話記錄表格
  function renderCallRecordsTable(
    records: CallRecord[],
    restrictToPanelA: boolean = true,
    dedupeByNumber: boolean = true
  ) {
    const filteredRecords = getFilteredCallRecords(records, restrictToPanelA, dedupeByNumber);
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Phone className="w-5 h-5 text-blue-600" />
              通話記錄
              {selectedAgent !== null && (
                <span className="text-sm font-normal text-gray-600">
                  - 座席 {selectedAgent.toString().padStart(2, '0')}
                </span>
              )}
            </h3>
            {selectedAgent !== null && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedAgent(null)}
                className="text-xs"
              >
                檢視全部
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2">
                <span
                  className={`inline-flex h-2.5 w-2.5 rounded-full ${
                    isCallDurationLoading ? 'bg-yellow-400 animate-pulse' : 'bg-green-500'
                  }`}
                />
                即時通話時長
              </span>
              <span>最新同步：{formatSyncTimestamp(callDurationLastSyncedAt)}</span>
            </div>
            <span>{isCallDurationLoading ? '同步中...' : `顯示 ${filteredRecords.length} 筆`}</span>
          </div>
          
          {/* 搜索和筛选区域 */}
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="搜索被叫號碼或備註..."
                value={callSearchQuery}
                onChange={(e) => setCallSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <Select value={callStatusFilter} onValueChange={setCallStatusFilter}>
              <SelectTrigger className="w-40 h-9 text-sm">
                <SelectValue placeholder="呼叫狀態" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部狀態</SelectItem>
                {availableCallStatuses.map((status) => (
                  <SelectItem key={status || 'unknown'} value={status}>
                    {status || '未分類'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={durationFilter.toString()} onValueChange={(value) => setDurationFilter(Number(value))}>
              <SelectTrigger className="w-48 h-9 text-sm">
                <SelectValue placeholder="通話時長篩選" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">全部通話</SelectItem>
                <SelectItem value="3">超過 3 分鐘</SelectItem>
                <SelectItem value="5">超過 5 分鐘</SelectItem>
                <SelectItem value="7">超過 7 分鐘</SelectItem>
                <SelectItem value="10">超過 10 分鐘</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="overflow-x-auto px-4">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-25">
                <TableHead className="w-32">被叫號碼</TableHead>
                <TableHead className="w-20 text-left">坐席</TableHead>
                <TableHead className="flex-1">備註</TableHead>
                <TableHead className="w-24">呼叫狀態</TableHead>
                <TableHead className="w-28">開始時間</TableHead>
                <TableHead className="w-24">通話時長</TableHead>
                <TableHead className="w-32">通話錄音</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map((record) => {
                const isExpanded = expandedCallRecords.has(record.id);
                const hasTranscript = record.transcript !== undefined;
                
                return (
                  <React.Fragment key={record.id}>
                    <TableRow className="hover:bg-gray-50">
                      <TableCell className="font-mono text-sm">
                        {formatPhoneNumber(record.calledNumber)}
                      </TableCell>
                      <TableCell className="text-left">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                          {record.agent.toString().padStart(2, '0')}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-gray-700">
                        {record.note}
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getCallStatusBadgeClass(record.callStatus)}`}>
                          {record.callStatus}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm font-mono">
                        {formatStartTime(record.callTime)}
                      </TableCell>
                      <TableCell className="text-sm font-mono">
                        {formatCallDuration(record.duration)}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => {
                            safeToast.success('錄音下載功能開發中');
                          }}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Download className="w-3 h-3" />
                          下載
                        </button>
                      </TableCell>
                      <TableCell>
                        {hasTranscript && (
                          <button
                            onClick={() => toggleCallRecordExpansion(record.id)}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-gray-600" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-600" />
                            )}
                          </button>
                        )}
                      </TableCell>
                    </TableRow>
                    
                    {/* 展開的通話記錄文本 */}
                    {isExpanded && hasTranscript && (
                      <TableRow>
                    <TableCell colSpan={8} className="bg-gray-50 p-4">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                              <Phone className="w-3 h-3" />
                              <span>通話記錄文本</span>
                            </div>
                            
                            {record.transcript!.isTranslated ? (
                              // 雙語顯示：中文（自動翻譯）+ 英文（原文）
                              <div className="space-y-3">
                                <div>
                                  <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">自動翻譯</span>
                                  </div>
                                  <p className="text-sm text-gray-800 leading-relaxed">
                                    {record.transcript!.chinese}
                                  </p>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                                    <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-xs">原文</span>
                                  </div>
                                  <p className="text-sm text-gray-700 leading-relaxed italic">
                                    {record.transcript!.english}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              // 純中文顯示（原文）
                              <div>
                                <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                                  <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-xs">原文</span>
                                </div>
                                <p className="text-sm text-gray-800 leading-relaxed">
                                  {record.transcript!.chinese}
                                </p>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
              {filteredRecords.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-gray-500 py-8 text-sm">
                    {isCallDurationLoading ? '資料同步中，請稍候...' : '暫無通話資料'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }
  
  // 渲染單個面板內容的函數
  function renderPanelContent(panel: 'A') {
    return (
      <>
        {/* 人員狀態監控 */}
        {renderStaffMonitor()}
        
        {/* 統計卡片 */}
        {renderStatsOnly(panel)}
        
        {/* 通話記錄表格 */}
        {renderCallRecordsTable(callRecords)}
      </>
    );
  }

  // 渲染整合面板內容
  function renderIntegrationPanelContent(panelKey: string) {
    const { status, records, monitorSummaries, seatStatuses } = integrationState;
    const panelRecords = records.filter((record) => record.integrationSource === panelKey);
    const hasData = status === 'success' && panelRecords.length > 0;
    const agentStats = buildIntegrationAgentStats(panelRecords, hasData, totalSeatCount);
    const seatStatusRows = seatStatuses[panelKey];
    const peerSeatList = seatStatusRows ? seatStatusRows.flat() : [];
    const hasPeerSeatStatus = peerSeatList.length > 0;
    const inCallCount = agentStats.filter((agent) => agent.status === 'inCall').length;
    const ringingCount = agentStats.filter((agent) => agent.status === 'ringing').length;
    const onlineCount = agentStats.filter((agent) => agent.status === 'online').length;
    const offlineCount = agentStats.filter((agent) => agent.status === 'offline').length;
    const noDataCount = agentStats.filter((agent) => agent.status === 'noData').length;
    const summary = monitorSummaries[panelKey];
    
    const totalDuration = panelRecords.reduce((sum, record) => sum + record.duration, 0);
    const avgSeconds = panelRecords.length > 0 ? Math.floor(totalDuration / panelRecords.length) : 0;
    // 穩定化長時間通話列表，避免閃爍：只顯示正在進行中的有效通話，同一通話只顯示一次
    const longRunningCalls = (() => {
      if (panelRecords.length === 0) return [];
      // 過濾條件：只顯示時長超過30秒且狀態為「通話中」的記錄，座席號碼必須在有效範圍內
      const validCalls = panelRecords.filter((record) => {
        // 時長必須超過30秒
        if (!record.duration || record.duration < 30) return false;
        // 狀態必須包含「通話中」
        if (!record.callStatus || !record.callStatus.includes('通話中')) return false;
        // 座席號碼必須在有效範圍內（1到實際座席數量，最多200）
        const maxSeat = Math.max(totalSeatCount, 200);
        if (!record.agent || record.agent < 1 || record.agent > maxSeat) return false;
        // 被叫號碼不能為空或無效
        if (!record.calledNumber || record.calledNumber === '-' || record.calledNumber.trim() === '') return false;
        return true;
      });
      
      if (validCalls.length === 0) return [];
      
      // 去重：同一座席的同一電話號碼只保留時長最長的那條記錄
      const uniqueCallsMap = new Map<string, CallRecord>();
      validCalls.forEach((record) => {
        // 使用座席號碼和被叫號碼作為唯一鍵
        const key = `${record.agent}-${record.calledNumber}`;
        const existing = uniqueCallsMap.get(key);
        if (!existing || record.duration > existing.duration) {
          uniqueCallsMap.set(key, record);
        }
      });
      
      const uniqueCalls = Array.from(uniqueCallsMap.values());
      
      // 按時長排序，但使用記錄ID作為穩定鍵，避免相同時長時順序變化
      const sorted = [...uniqueCalls].sort((a, b) => {
        if (b.duration !== a.duration) {
          return b.duration - a.duration;
        }
        // 時長相同時，按ID排序以保持穩定
        return a.id.localeCompare(b.id);
      });
      return sorted.slice(0, 3);
    })();
    
    const manualCalls = summary?.manualCalls ?? panelRecords.length;
    const segmentTotal = summary
      ? summary.segmentCounts.segment1 +
        summary.segmentCounts.segment2 +
        summary.segmentCounts.segment3 +
        summary.segmentCounts.segment4
      : panelRecords.length;
    const voicePackages =
      summary?.voiceCallCount !== undefined ? summary.voiceCallCount : segmentTotal;
    const connectCalls = panelRecords.filter((record) => record.callStatus !== '轉座席').length;
    const callbackCalls = panelRecords.filter((record) => record.callStatus === '轉座席').length;
    const derivedConnectRate =
      panelRecords.length > 0 ? Math.round((connectCalls / panelRecords.length) * 100) : undefined;
    const derivedCallbackRate =
      panelRecords.length > 0 ? Math.round((callbackCalls / panelRecords.length) * 100) : undefined;
    const connectRateValue = summary?.connectRate ?? derivedConnectRate;
    const callbackRateValue = summary?.callbackRate ?? derivedCallbackRate;
    
    const seatStatusCounts = hasPeerSeatStatus
      ? peerSeatList.reduce<Record<SeatStatusType, number>>((acc, seat) => {
          acc[seat.status] = (acc[seat.status] || 0) + 1;
          return acc;
        }, {} as Record<SeatStatusType, number>)
      : null;
    const inCallDisplay = hasPeerSeatStatus
      ? `${seatStatusCounts?.inCall ?? 0}人`
      : hasData
      ? `${inCallCount}人`
      : '-';
    const ringingDisplay = hasPeerSeatStatus
      ? `${seatStatusCounts?.ringing ?? 0}人`
      : hasData
      ? `${ringingCount}人`
      : '-';
    const onlineDisplay = hasPeerSeatStatus
      ? `${seatStatusCounts?.online ?? 0}人`
      : hasData
      ? `${onlineCount}人`
      : '-';
    const offlineDisplay = hasPeerSeatStatus
      ? `${seatStatusCounts?.offline ?? 0}人`
      : hasData
      ? `${offlineCount}人`
      : '-';
    const concurrentDisplay = '-';
    const hasVoicePackageData = summary !== undefined || panelRecords.length > 0;
    const voicePackageDisplay = hasVoicePackageData ? `${voicePackages} 則` : '-';
    const connectDisplay =
      connectRateValue !== undefined || callbackRateValue !== undefined
        ? `接通：${connectRateValue !== undefined ? formatPercentage(connectRateValue) : '-'} 回撥：${
            callbackRateValue !== undefined ? formatPercentage(callbackRateValue) : '-'
          }`
        : '-';
    const avgDurationDisplay = hasData ? formatCallDuration(avgSeconds) : '-';
    
    const agentStatsMap = new Map(agentStats.map((agent) => [agent.seatNumber, agent]));
    // 創建從 HTML 解析的座席狀態映射（優先使用）
    const peerSeatStatusMap = new Map<number, SeatStatusType>();
    if (hasPeerSeatStatus && peerSeatList.length > 0) {
      peerSeatList.forEach((seat) => {
        peerSeatStatusMap.set(seat.seatNumber, seat.status);
      });
    }

    const getSeatStats = (seatNumber: number): AgentDisplayState => {
      const baseStats = agentStatsMap.get(seatNumber) || {
        seatNumber,
        status: hasData ? 'offline' : 'noData' as AgentDisplayState['status'],
        stats: {
          answered: 0,
          hungUp: 0,
          avgDuration: 0,
          maxDuration: 0,
          maxCallNumber: '-',
          onlineTime: 0
        }
      };
      
      // 優先使用從 HTML 解析的座席狀態（更實時準確）
      if (hasPeerSeatStatus && peerSeatStatusMap.has(seatNumber)) {
        const htmlStatus = peerSeatStatusMap.get(seatNumber)!;
        return {
          ...baseStats,
          status: htmlStatus === 'inCall' ? 'inCall' : 
                  htmlStatus === 'ringing' ? 'ringing' : 
                  htmlStatus === 'online' ? 'online' : 
                  htmlStatus === 'offline' ? 'offline' : 
                  baseStats.status
        };
      }
      
      return baseStats;
    };

    const getSeatStatusLabel = (status: SeatStatusType): string => {
      switch (status) {
        case 'inCall':
          return '通話中';
        case 'ringing':
          return '振鈴中';
        case 'online':
          return '待機';
        case 'offline':
          return '離線';
        case 'disconnected':
          return '斷線';
        default:
          return '未知';
      }
    };

    const getSeatStatusClasses = (status: SeatStatusType) => {
      switch (status) {
        case 'inCall':
          return { bgClass: 'bg-blue-500', textClass: 'text-white', nameClass: 'text-white' };
        case 'ringing':
          return { bgClass: 'bg-purple-500', textClass: 'text-white', nameClass: 'text-white' };
        case 'online':
          return { bgClass: 'bg-green-500', textClass: 'text-white', nameClass: 'text-white' };
        case 'offline':
          return { bgClass: 'bg-red-500', textClass: 'text-white', nameClass: 'text-white' };
        case 'disconnected':
          return { bgClass: 'bg-gray-400', textClass: 'text-white', nameClass: 'text-white' };
        default:
          return { bgClass: 'bg-gray-200 border border-gray-300', textClass: 'text-gray-700', nameClass: 'text-gray-600' };
      }
    };

    const renderPeerSeatGrid = () => {
      if (!seatStatusRows || seatStatusRows.length === 0) return null;
      const flattenedSeats = seatStatusRows.flat();
      return (
        <div className="grid gap-2 justify-start" style={seatGridStyle}>
          {flattenedSeats.map((seat, seatIndex) => {
            const seatNumber = seat.seatNumber;
            const paddedNumber = seatNumber.toString().padStart(2, '0');
            const seatStats = getSeatStats(seatNumber);
            const agentName = getAgentDisplayName(seatNumber);
            const statusLabel = getSeatStatusLabel(seat.status);
            const { bgClass, textClass, nameClass } = getSeatStatusClasses(seat.status);
            const isSelected = selectedAgent === seatNumber;
            const displayLabel = getSeatDisplayLabel(seatNumber);
            return (
              <Tooltip key={`peer-seat-${seatIndex}-${seatNumber}`}>
                <TooltipTrigger asChild>
                  <div
                    className={`${bgClass} ${textClass} rounded-lg p-2 text-center cursor-pointer hover:opacity-80 transition-all w-full h-16 flex flex-col items-center justify-center ${
                      isSelected ? 'ring-4 ring-yellow-400 ring-offset-2' : ''
                    }`}
                    onClick={() => handleAgentClick(seatNumber)}
                  >
                    <div className="font-semibold text-sm">{displayLabel}</div>
                    <div className={`text-xs mt-1 opacity-90 ${nameClass}`}>{agentName}</div>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="p-3">
                  <div className="text-xs space-y-1">
                    <div className="font-semibold text-sm mb-2 border-b pb-1">
                      座席 {paddedNumber} - {statusLabel}
                    </div>
                    <div>
                      接聽：<span className="font-medium">{seatStats.stats.answered}</span> 通
                    </div>
                    <div>
                      掛掉：<span className="font-medium">{seatStats.stats.hungUp}</span> 通
                    </div>
                    <div>
                      平均話時長：
                      <span className="font-medium">
                        {Math.floor(seatStats.stats.avgDuration / 60)}分{seatStats.stats.avgDuration % 60}秒
                      </span>
                    </div>
                    <div>
                      最長通話：
                      <span className="font-medium">{Math.floor(seatStats.stats.maxDuration / 60)}</span> 分鐘
                    </div>
                    <div>
                      最長通話號碼：
                      <span className="font-medium">{formatPhoneNumber(seatStats.stats.maxCallNumber)}</span>
                    </div>
                    <div>
                      在線時間：
                      <span className="font-medium">
                        {Math.floor(seatStats.stats.onlineTime / 60)}小時{seatStats.stats.onlineTime % 60}分
                      </span>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      );
    };

    const renderDefaultSeatGrid = () => (
      <div className="grid gap-2 justify-start" style={seatGridStyle}>
        {defaultSeatNumbers.map((seatNumber) => {
          const seatData = getSeatStats(seatNumber);
                const isSelected = selectedAgent === seatNumber;
          const bgColor =
            seatData.status === 'inCall'
              ? 'bg-blue-500'
              : seatData.status === 'ringing'
              ? 'bg-purple-500'
              : seatData.status === 'online'
              ? 'bg-green-500'
              : seatData.status === 'offline'
              ? 'bg-red-500'
              : 'bg-gray-200 border border-gray-300';
          const statusText =
            seatData.status === 'inCall'
              ? '通話中'
              : seatData.status === 'ringing'
              ? '振鈴中'
              : seatData.status === 'online'
              ? '上線中'
              : seatData.status === 'offline'
              ? '離線'
              : '暫無資料';
          const textColor = seatData.status === 'noData' ? 'text-gray-700' : 'text-white';
          const nameColor = seatData.status === 'noData' ? 'text-gray-600' : 'text-white';
          const displayLabel = getSeatDisplayLabel(seatNumber);
                
                return (
            <Tooltip key={`integration-seat-${seatNumber}`}>
                    <TooltipTrigger asChild>
                      <div 
                  className={`${bgColor} ${textColor} rounded-lg p-2 text-center cursor-pointer hover:opacity-80 transition-all w-full h-16 flex flex-col items-center justify-center ${
                          isSelected ? 'ring-4 ring-yellow-400 ring-offset-2' : ''
                        }`}
                        onClick={() => handleAgentClick(seatNumber)}
                      >
                  <div className="font-semibold text-sm">{displayLabel}</div>
                  <div className={`text-xs mt-1 opacity-90 ${nameColor}`}>{getAgentDisplayName(seatNumber)}</div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="p-3">
                      <div className="text-xs space-y-1">
                  <div className="font-semibold text-sm mb-2 border-b pb-1">
                    座席 {seatNumber.toString().padStart(2, '0')} - {statusText}
                  </div>
                  <div>
                    接聽：<span className="font-medium">{seatData.stats.answered}</span> 通
                  </div>
                  <div>
                    掛掉：<span className="font-medium">{seatData.stats.hungUp}</span> 通
                  </div>
                  <div>
                    平均話時長：
                    <span className="font-medium">
                      {Math.floor(seatData.stats.avgDuration / 60)}分{seatData.stats.avgDuration % 60}秒
                    </span>
                  </div>
                  <div>
                    最長通話：
                    <span className="font-medium">{Math.floor(seatData.stats.maxDuration / 60)}</span> 分鐘
                  </div>
                  <div>
                    最長通話號碼：
                    <span className="font-medium">{formatPhoneNumber(seatData.stats.maxCallNumber)}</span>
                  </div>
                  <div>
                    在線時間：
                    <span className="font-medium">
                      {Math.floor(seatData.stats.onlineTime / 60)}小時{seatData.stats.onlineTime % 60}分
                    </span>
                  </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
        })}
          </div>
    );

    return (
      <>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                人員狀態監控
              </h3>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-gray-600">通話中：<span className="font-semibold text-gray-800">{inCallDisplay}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                  <span className="text-gray-600">振鈴中：<span className="font-semibold text-gray-800">{ringingDisplay}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-gray-600">上線中：<span className="font-semibold text-gray-800">{onlineDisplay}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-gray-600">離線：<span className="font-semibold text-gray-800">{offlineDisplay}</span></span>
                </div>
                {!hasPeerSeatStatus && noDataCount === agentStats.length && (
                  <div className="flex items-center gap-2 text-gray-500">
                    <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                    <span>暫無資料</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="p-4">
            {hasPeerSeatStatus ? renderPeerSeatGrid() : renderDefaultSeatGrid()}
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-gray-600">併發數 / 接聽語音包中</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 mb-1">併發數</div>
                <div className="text-2xl font-bold text-blue-600">{concurrentDisplay}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500 mb-1">接聽語音包中</div>
                <div className="text-2xl font-bold text-purple-600">{voicePackageDisplay}</div>
            </div>
          </div>
        </div>

        <div className="flex-1 bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="text-sm text-gray-600">接通/回撥率 / 平均時長</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 mb-1">接通/回撥</div>
                <div className="text-lg font-bold text-green-600">{connectDisplay}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500 mb-1">平均時長</div>
                <div className="text-2xl font-bold text-cyan-600">{avgDurationDisplay}</div>
            </div>
          </div>
        </div>

        <div className="flex-1 bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-orange-600" />
            <span className="text-sm text-gray-600">長時間進行中的通話</span>
          </div>
            <div className="text-xs text-gray-600 space-y-0.5">
              {longRunningCalls.length === 0 || !hasData ? (
                <div>-</div>
              ) : (
                longRunningCalls.map((record) => (
                  <div key={record.id}>
                    座席{record.agent.toString().padStart(2, '0')} | {formatPhoneNumber(record.calledNumber)} | {formatCallDuration(record.duration)}
            </div>
                ))
          )}
            </div>
        </div>
      </div>

      {/* 通話記錄表格 */}
        {renderCallRecordsTable(panelRecords, false, false)}
      </>
    );
  }
  
  return (
    <TooltipProvider>
    <div className="p-6 space-y-6 bg-gray-50 min-h-full">
      {/* 面板選擇按鈕和工具菜單 */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedPanel('A')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedPanel === 'A'
                ? 'bg-black text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-800 hover:text-white'
            }`}
          >
            展示用
          </button>
          {integrationSources.map((source) => (
          <button
              key={source}
              onClick={() => setSelectedPanel(source)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedPanel === source
                ? 'bg-black text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-800 hover:text-white'
            }`}
          >
              {source}
          </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* WebSocket 連線狀態顯示 */}
          <span className={`text-xs flex items-center gap-1 ${
            isConnected ? 'text-green-600' : 'text-red-600'
          }`}>
            {isConnected ? (
              <CheckCircle className="w-3 h-3" />
            ) : (
              <AlertTriangle className="w-3 h-3" />
            )}
            websocket連線狀態：{isConnected ? '成功' : '失敗'}
          </span>

          {isIntegrationPanelSelected && (
            <>
              {integrationState.status === 'error' && (
                <span className="flex items-center text-xs text-red-600 gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  無法成功加載數據
                </span>
              )}
              <Button
                onClick={fetchIntegrationData}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 text-xs"
              >
                <RefreshCw className={`w-3 h-3 ${integrationState.status === 'loading' ? 'animate-spin' : ''}`} />
                {integrationState.status === 'loading' ? '同步中' : '重新整理'}
              </Button>
            </>
          )}

        {/* 工具下拉菜單 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-800 hover:text-white transition-colors flex items-center gap-1">
              工具
              <ChevronDown className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleOpenAgentNamesDialog} className="cursor-pointer">
              <Edit2 className="w-4 h-4 mr-2" />
              編輯座席姓名
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-600">
              <LogOut className="w-4 h-4 mr-2" />
              登出
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
          </div>
          
      {/* 主要內容區域 - 根據選擇的面板顯示 */}
      {isIntegrationPanelSelected ? (
        renderIntegrationPanelContent(selectedPanel)
      ) : (
        /* 展示用面板 */
        renderPanelContent('A')
      )}

      {/* 座席姓名編輯對話框 */}
      <Dialog open={isAgentNamesDialogOpen} onOpenChange={setIsAgentNamesDialogOpen}>
        <DialogContent
          hideCloseButton
          className="flex flex-col p-0 overflow-hidden w-auto max-w-none sm:max-w-none"
          style={{ width: agentDialogWidth, height: '520px' }}
        >
          <div className="border-b">
            <div className="px-6 py-4 flex items-center justify-between">
              <DialogTitle className="text-xl font-bold text-gray-900">編輯座席姓名</DialogTitle>
              <DialogDescription className="sr-only">編輯座席編號對應的人員姓名</DialogDescription>
              <DialogClose asChild>
                <button
                  className="text-[16px] font-semibold text-gray-600 hover:text-gray-900 transition-colors"
                  aria-label="關閉"
                >
                  ×
                </button>
              </DialogClose>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
            <div className="grid gap-3" style={agentNameGridStyle}>
              {Array.from({ length: Math.max(tempAgentNames.length, DEFAULT_TOTAL_SEATS) }, (_, idx) => idx + 1).map((seatNumber) => {
                const canDeleteSeat = seatNumber > DEFAULT_TOTAL_SEATS;
                return (
                  <div
                    key={`agent-name-${seatNumber}`}
                    className="relative flex flex-col items-center justify-between gap-1 border border-gray-300 rounded-lg p-3 bg-white hover:border-gray-400 hover:shadow-sm transition-all h-20 w-full"
                  >
                    <span className="text-xs font-semibold text-gray-600">
                      {getSeatDisplayLabel(seatNumber)}
                    </span>
                    {canDeleteSeat && (
                      <button
                        type="button"
                        className="absolute top-2 right-2 text-xs text-gray-400 hover:text-red-500 transition-colors"
                        onClick={() => handleRequestDeleteSeat(seatNumber)}
                        aria-label={`刪除座席 ${getSeatDisplayLabel(seatNumber)}`}
                      >
                        ×
                      </button>
                    )}
                <Input
                      value={tempAgentNames[seatNumber - 1] || ''}
                  onChange={(e) => {
                    const newNames = [...tempAgentNames];
                        while (newNames.length < seatNumber) {
                          newNames.push('');
                        }
                        newNames[seatNumber - 1] = e.target.value;
                    setTempAgentNames(newNames);
                  }}
                      className="text-sm h-8 w-full text-center"
                      placeholder="姓名"
                      title={`座席 ${getSeatDisplayLabel(seatNumber)}`}
                />
              </div>
                );
              })}
            </div>
          </div>
          
          <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setTempAgentNames((prev) => [...prev, ''])}
              className="flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              新增座席
            </Button>
            
            <div className="flex gap-2">
            <Button
              onClick={handleCancelAgentNames}
              variant="outline"
                className="min-w-[80px]"
            >
              取消
            </Button>
            <Button
              onClick={handleSaveAgentNames}
                className="bg-black text-white hover:bg-gray-800 min-w-[80px]"
            >
                確認
            </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {isDeleteSeatDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={handleCancelDeleteSeatDialog}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-[360px] max-w-[90vw] p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">刪除座席</h3>
              <p className="text-sm text-gray-600">
                {seatToDelete ? `確定要刪除座席 ${getSeatDisplayLabel(seatToDelete)} 嗎？操作無法復原。` : '確定要刪除此座席嗎？'}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelDeleteSeatDialog}
                className="w-24 px-4 py-2 rounded-md border text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSeat}
                className="w-24 px-4 py-2 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                確認刪除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </TooltipProvider>
  );
}
