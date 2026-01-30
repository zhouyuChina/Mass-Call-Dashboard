import { describe, it, expect } from 'vitest';

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

// ===== Tests =====

describe('formatPercentage', () => {
  it('should format integer percentages without decimal', () => {
    expect(formatPercentage(50)).toBe('50%');
    expect(formatPercentage(100)).toBe('100%');
    expect(formatPercentage(0)).toBe('0%');
  });

  it('should format decimal percentages with one decimal place', () => {
    expect(formatPercentage(50.5)).toBe('50.5%');
    expect(formatPercentage(33.333)).toBe('33.3%');
    expect(formatPercentage(99.99)).toBe('100.0%');
  });

  it('should return "-" for non-finite values', () => {
    expect(formatPercentage(NaN)).toBe('-');
    expect(formatPercentage(Infinity)).toBe('-');
    expect(formatPercentage(-Infinity)).toBe('-');
  });
});

describe('calculateAverage', () => {
  it('should calculate average of numbers', () => {
    expect(calculateAverage([10, 20, 30])).toBe(20);
    expect(calculateAverage([5, 5, 5, 5])).toBe(5);
    expect(calculateAverage([100])).toBe(100);
  });

  it('should return undefined for empty array', () => {
    expect(calculateAverage([])).toBeUndefined();
  });

  it('should handle decimal results', () => {
    expect(calculateAverage([1, 2, 3])).toBe(2);
    expect(calculateAverage([10, 15, 20])).toBe(15);
  });
});

describe('extractNumber', () => {
  it('should extract number from text using pattern', () => {
    expect(extractNumber('人工通話：123', /人工通話：\s*(\d+)/i)).toBe(123);
    expect(extractNumber('一段：45', /一段：\s*(\d+)/i)).toBe(45);
  });

  it('should return 0 if pattern does not match', () => {
    expect(extractNumber('no numbers here', /(\d+)/)).toBe(0);
    expect(extractNumber('人工通話：abc', /人工通話：\s*(\d+)/i)).toBe(0);
  });

  it('should return 0 for empty string', () => {
    expect(extractNumber('', /(\d+)/)).toBe(0);
  });
});

describe('cleanText', () => {
  it('should remove &nbsp; and normalize whitespace', () => {
    expect(cleanText('hello&nbsp;world')).toBe('hello world');
    expect(cleanText('multiple   spaces')).toBe('multiple spaces');
    expect(cleanText('  trim  me  ')).toBe('trim me');
  });

  it('should return empty string for null or undefined', () => {
    expect(cleanText(null)).toBe('');
    expect(cleanText(undefined)).toBe('');
    expect(cleanText('')).toBe('');
  });
});

describe('hashString', () => {
  it('should generate consistent hash for same string', () => {
    const hash1 = hashString('test');
    const hash2 = hashString('test');
    expect(hash1).toBe(hash2);
  });

  it('should generate different hashes for different strings', () => {
    const hash1 = hashString('test1');
    const hash2 = hashString('test2');
    expect(hash1).not.toBe(hash2);
  });

  it('should always return positive number', () => {
    expect(hashString('test')).toBeGreaterThanOrEqual(0);
    expect(hashString('negative')).toBeGreaterThanOrEqual(0);
  });

  it('should handle empty string', () => {
    expect(hashString('')).toBe(0);
  });
});

describe('parseDurationToSeconds', () => {
  it('should parse HH:MM:SS format', () => {
    expect(parseDurationToSeconds('01:30:45')).toBe(5445); // 1*3600 + 30*60 + 45
    expect(parseDurationToSeconds('00:05:30')).toBe(330);
    expect(parseDurationToSeconds('2:00:00')).toBe(7200);
  });

  it('should parse MM:SS format', () => {
    expect(parseDurationToSeconds('05:30')).toBe(330); // 5*60 + 30
    expect(parseDurationToSeconds('00:45')).toBe(45);
    expect(parseDurationToSeconds('120:00')).toBe(7200);
  });

  it('should parse Chinese format', () => {
    expect(parseDurationToSeconds('1小時30分15秒')).toBe(5415);
    expect(parseDurationToSeconds('30分')).toBe(1800);
    expect(parseDurationToSeconds('45秒')).toBe(45);
    expect(parseDurationToSeconds('2小时')).toBe(7200);
  });

  it('should return 0 for invalid or empty input', () => {
    expect(parseDurationToSeconds('')).toBe(0);
    expect(parseDurationToSeconds(undefined)).toBe(0);
    expect(parseDurationToSeconds('   ')).toBe(0);
    expect(parseDurationToSeconds('invalid')).toBe(0);
  });
});
