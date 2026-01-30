/**
 * 座席相关工具函数
 */

import type { PeerSeatStatus, PeerSeatStatusRow, PeerSeatColor, SeatStatusType } from '../types';

const SEATS_PER_ROW = 10;
const DEFAULT_TOTAL_SEATS = 20;

/**
 * 将座位号数组按行分组
 */
export function chunkSeatNumbers(numbers: number[], perRow: number = SEATS_PER_ROW): number[][] {
  const rows: number[][] = [];
  for (let i = 0; i < numbers.length; i += perRow) {
    rows.push(numbers.slice(i, i + perRow));
  }
  return rows;
}

/**
 * 将对端座席状态数组按行分组
 */
export function chunkPeerSeatRow(row: PeerSeatStatus[], perRow: number = SEATS_PER_ROW): PeerSeatStatusRow[] {
  const rows: PeerSeatStatusRow[] = [];
  for (let i = 0; i < row.length; i += perRow) {
    rows.push(row.slice(i, i + perRow));
  }
  return rows;
}

/**
 * 获取座席显示标签
 */
export function getSeatDisplayLabel(seatNumber: number): string {
  return seatNumber.toString().padStart(2, '0');
}

/**
 * 规范化座席名称
 */
export function normalizeAgentNames(saved: string[] | null, defaults: string[]): string[] {
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

/**
 * 将对端颜色映射到座席状态
 */
export function mapPeerColorToStatus(color: PeerSeatColor): SeatStatusType {
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

export { SEATS_PER_ROW, DEFAULT_TOTAL_SEATS };
