export type SeatStatusType = 'online' | 'offline' | 'ringing' | 'inCall' | 'disconnected';

export interface SeatStatusConfig {
  bgColor: string;
  statusText: string;
}

const STATUS_CONFIG: Record<SeatStatusType, SeatStatusConfig> = {
  online: { bgColor: 'bg-green-500', statusText: '上線中' },
  offline: { bgColor: 'bg-red-500', statusText: '離線' },
  ringing: { bgColor: 'bg-purple-500', statusText: '振鈴中' },
  inCall: { bgColor: 'bg-blue-500', statusText: '通話中' },
  disconnected: { bgColor: 'bg-gray-500', statusText: '斷線' }
};

/**
 * 格式化电话号码
 */
export function formatPhoneNumber(phoneNumber: string): string {
  const cleaned = phoneNumber.replace(/\D/g, '');

  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }

  return phoneNumber;
}

/**
 * 获取座席状态配置
 */
export function getSeatStatusConfig(status: SeatStatusType): SeatStatusConfig {
  return STATUS_CONFIG[status];
}
