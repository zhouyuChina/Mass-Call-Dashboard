/**
 * HTML 解析工具函数
 * 用于解析通话记录和座席状态的 HTML 内容
 */

import type { MonitorSummary, MonitorCallRow, PeerSeatStatusRow, PeerSeatStatus, PeerSeatColor } from '../../types';
import { extractNumber, cleanText } from '../../utils/callRecordUtils';
import { mapPeerColorToStatus } from '../../utils/seatUtils';

/**
 * 创建空的监控摘要
 */
export function createEmptyMonitorSummary(): MonitorSummary {
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

/**
 * 解析通话表格
 */
export function parseCallTable(tableHtml: string): { calls: MonitorCallRow[]; summary: MonitorSummary } {
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
    connectRate: undefined,
    callbackRate: undefined,
    connectRateSamples: 0,
    callbackRateSamples: 0
  };

  const rows = Array.from(table.querySelectorAll('tr')).filter((row) => row.querySelectorAll('td').length > 0);
  const calls: MonitorCallRow[] = [];

  rows.forEach((row, index) => {
    const cells = Array.from(row.querySelectorAll('td'));
    if (cells.length < 5) return;

    const calledNumber = cleanText(cells[1]?.textContent);
    const callbackNumber = cleanText(cells[2]?.textContent);
    const callStatus = cleanText(cells[3]?.textContent);
    const startTime = cleanText(cells[4]?.textContent);
    const durationText = cells.length > 5 ? cleanText(cells[5]?.textContent) : undefined;

    calls.push({
      sequence: index + 1,
      calledNumber,
      callbackNumber: callbackNumber || undefined,
      callStatus,
      startTime: startTime || undefined,
      durationText,
      rawHtml: row.innerHTML
    });
  });

  return { calls, summary };
}

/**
 * 解析活动控制器表格
 */
export function parseCampaignControllerTable(tableHtml: string): { calls: MonitorCallRow[]; summary: MonitorSummary } {
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
    if (connectMatch) {
      const value = Number.parseFloat(connectMatch[1]);
      if (!Number.isNaN(value)) {
        connectValues.push(value);
      }
    }
    const callbackMatch = textContent.match(/回撥\s*[：:]\s*([\d.]+)/i);
    if (callbackMatch) {
      const value = Number.parseFloat(callbackMatch[1]);
      if (!Number.isNaN(value)) {
        callbackValues.push(value);
      }
    }
  });

  const connectRate = connectValues.length > 0
    ? connectValues.reduce((sum, v) => sum + v, 0) / connectValues.length
    : undefined;
  const callbackRate = callbackValues.length > 0
    ? callbackValues.reduce((sum, v) => sum + v, 0) / callbackValues.length
    : undefined;

  return {
    calls: [],
    summary: {
      ...createEmptyMonitorSummary(),
      connectRate,
      callbackRate,
      connectRateSamples: connectValues.length,
      callbackRateSamples: callbackValues.length
    }
  };
}

/**
 * 解析对端状态 HTML
 */
export function parsePeerStatusHtml(html: string): PeerSeatStatusRow[] | null {
  if (!html) return null;
  // 检查是否包含座席状态相关的内容
  if (!/綠色-待機|紅色-離線|get_peer_status|get_curcall_in/i.test(html)) {
    return null;
  }

  const sanitized = html
    .replace(/<\/br>/gi, '<br/>')
    .replace(/<br\s*\/?>/gi, '<br/>');
  const parser = new DOMParser();
  const doc = parser.parseFromString(sanitized, 'text/html');
  const [firstSection] = doc.body.innerHTML.split(/<br\s*\/?>\\s*<br\s*\/?>/i);
  const targetSection = firstSection || doc.body.innerHTML;

  const segments = targetSection
    .split(/<br\s*\/?>/i)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0 && !segment.includes('綠色-待機'));

  const fontRegex = /<font[^>]*color=['"]?(green|red|purple|blue|grey)['"]?[^>]*>\s*([0-9]{1,3})\s*<\/font>/gi;
  const allSeats: PeerSeatStatus[] = [];

  segments.forEach((segment) => {
    let match: RegExpExecArray | null;
    while ((match = fontRegex.exec(segment)) !== null) {
      const color = match[1].toLowerCase() as PeerSeatColor;
      const seatNumber = Number.parseInt(match[2], 10);
      if (!Number.isNaN(seatNumber) && seatNumber > 0) {
        allSeats.push({
          seatNumber,
          status: mapPeerColorToStatus(color)
        });
      }
    }
  });

  if (allSeats.length === 0) {
    return null;
  }

  // 按座席号排序
  allSeats.sort((a, b) => a.seatNumber - b.seatNumber);

  // 按每行 10 个分组
  const rows: PeerSeatStatusRow[] = [];
  for (let i = 0; i < allSeats.length; i += 10) {
    rows.push(allSeats.slice(i, i + 10));
  }

  return rows;
}

/**
 * 提取百分比值
 */
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

/**
 * 提取活动比率
 */
export function extractCampaignRates(tableHtml: string): Pick<
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

  const connectRate = connectValues.length > 0
    ? connectValues.reduce((sum, v) => sum + v, 0) / connectValues.length
    : undefined;
  const callbackRate = callbackValues.length > 0
    ? callbackValues.reduce((sum, v) => sum + v, 0) / callbackValues.length
    : undefined;

  return {
    connectRate,
    callbackRate,
    connectRateSamples: connectValues.length,
    callbackRateSamples: callbackValues.length
  };
}
