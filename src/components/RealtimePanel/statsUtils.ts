/**
 * 格式化通话时长（秒）为可读字符串
 */
export function formatCallDuration(seconds: number): string {
  if (seconds === 0) return '0秒';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];

  if (hours > 0) {
    parts.push(`${hours}小時`);
  }

  if (hours > 0 || minutes > 0) {
    parts.push(`${minutes}分`);
  }

  parts.push(`${secs}秒`);

  return parts.join('');
}

/**
 * 计算平均时长
 */
export function calculateAverageDuration(durations: number[]): number {
  if (durations.length === 0) return 0;

  const total = durations.reduce((sum, duration) => sum + duration, 0);
  return Math.floor(total / durations.length);
}
