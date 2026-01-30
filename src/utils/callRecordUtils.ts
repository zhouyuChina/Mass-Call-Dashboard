/**
 * 通话记录相关工具函数
 */

/**
 * 格式化百分比
 */
export function formatPercentage(value: number): string {
  if (!Number.isFinite(value)) return '-';
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(1)}%`;
}

/**
 * 计算平均值
 */
export function calculateAverage(values: number[]): number | undefined {
  if (!values.length) return undefined;
  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

/**
 * 从文本中提取数字
 */
export function extractNumber(text: string, pattern: RegExp): number {
  const match = text.match(pattern);
  return match ? Number.parseInt(match[1], 10) || 0 : 0;
}

/**
 * 清理文本
 */
export function cleanText(value?: string | null): string {
  if (!value) return '';
  return value.replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * 字符串哈希函数
 */
export function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * 解析时长文本为秒数
 */
export function parseDurationToSeconds(text?: string): number {
  if (!text) return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;

  // Handle HH:MM:SS or MM:SS format
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':').map((part) => Number.parseInt(part, 10) || 0);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
  }

  // Handle Chinese format like "1小時30分15秒"
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

/**
 * 解析监控日期
 */
export function parseMonitorDate(text?: string): Date {
  if (!text) return new Date();
  const normalized = text.replace(/\//g, '-');
  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }
  return new Date();
}

/**
 * 从状态中提取座席号
 */
export function extractAgentNumberFromStatus(status: string, fallback: number): number {
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

/**
 * 获取通话状态徽章样式类
 */
export function getCallStatusBadgeClass(status: string): string {
  if (!status) return 'bg-gray-100 text-gray-800';
  if (status.includes('振鈴')) return 'bg-purple-100 text-purple-800';
  if (status.includes('主打撥打')) return 'bg-green-100 text-green-800';
  if (status.includes('轉座席') || status.includes('回撥')) return 'bg-orange-100 text-orange-800';
  if (status.includes('通話') || status.includes('一段') || status.includes('二段')) return 'bg-blue-100 text-blue-800';
  return 'bg-gray-100 text-gray-800';
}

/**
 * 规范化被叫号码
 */
export function normalizeCalledNumber(value?: string): string {
  if (!value) return '-';
  const digits = value.replace(/\D/g, '');
  const withoutLeadingZero = digits.replace(/^0+/, '');
  if (withoutLeadingZero) return withoutLeadingZero;
  return digits || '-';
}

/**
 * 从回拨号码推导座席号
 */
export function deriveSeatFromCallback(callback?: string): number | undefined {
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

/**
 * 确定通话状态显示
 */
export function determineCallStatusDisplay(rawStatus: string): string {
  const text = rawStatus || '';
  if (/座席/i.test(text)) {
    return '通話中';
  }
  if (/振鈴/.test(text)) {
    return text || '振鈴中';
  }
  return text || '聯調通話';
}
