const CALL_DURATION_API = import.meta.env.VITE_CALL_DURATION_API as string | undefined;

export interface CallDurationApiEntry {
  calledNumber: string;
  agent: number;
  duration: number;
  createdAt?: number;
}

interface RawCallDurationPayload {
  calledNumber?: string;
  agent?: number | string;
  duration?: number | string;
  createdAt?: number | string;
}

export async function fetchCallDurationSnapshot(): Promise<CallDurationApiEntry[]> {
  if (CALL_DURATION_API) {
    const response = await fetch(CALL_DURATION_API, {
      headers: {
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('無法取得通話時長資料');
    }

    const payload = await response.json();
    const normalized = normalizePayload(payload);
    if (normalized.length > 0) {
      return normalized;
    }
  }

  return generateMockCallDurationSnapshot();
}

function normalizePayload(payload: any): CallDurationApiEntry[] {
  if (!payload) return [];
  if (Array.isArray(payload)) {
    return sanitizeEntries(payload);
  }
  if (Array.isArray(payload?.data)) {
    return sanitizeEntries(payload.data);
  }
  if (Array.isArray(payload?.result)) {
    return sanitizeEntries(payload.result);
  }
  return [];
}

function sanitizeEntries(entries: any[]): CallDurationApiEntry[] {
  return entries
    .map((entry) => {
      const data = entry as RawCallDurationPayload;
      const calledNumber = typeof data.calledNumber === 'string' ? data.calledNumber : '';
      const agent =
        typeof data.agent === 'number'
          ? data.agent
          : typeof data.agent === 'string'
          ? Number.parseInt(data.agent, 10)
          : NaN;
      const duration =
        typeof data.duration === 'number'
          ? data.duration
          : typeof data.duration === 'string'
          ? Number.parseInt(data.duration, 10)
          : NaN;
      if (!calledNumber || Number.isNaN(agent) || Number.isNaN(duration)) {
        return null;
      }
      const createdAt = normalizeTimestamp(data.createdAt);
      return {
        calledNumber: calledNumber.replace(/\D/g, ''),
        agent,
        duration: Math.max(0, duration),
        createdAt
      };
    })
    .filter((entry): entry is CallDurationApiEntry => entry !== null);
}

// ---- Mock helpers (for local development before backend is ready) ----
interface MockCallDurationEntry extends CallDurationApiEntry {
  isActive: boolean;
  lastTick: number;
}

const MOCK_NUMBERS = [
  '7035971234',
  '7035972456',
  '7035973678',
  '7035974890',
  '5122001357',
  '5122002468',
  '6177003579',
  '6177004680',
  '2532025791',
  '2532026802'
];

const mockEntries: MockCallDurationEntry[] = MOCK_NUMBERS.map((number, index) => ({
  calledNumber: number,
  agent: (index % 10) + 1,
  duration: Math.floor(Math.random() * 120),
  createdAt: Date.now(),
  isActive: true,
  lastTick: Date.now()
}));

function generateMockCallDurationSnapshot(): CallDurationApiEntry[] {
  const now = Date.now();

  mockEntries.forEach((entry) => {
    if (!entry.isActive) {
      // 讓部分已結束的通話在一段時間後重新連線，模擬新通話進入
      if (now - entry.lastTick > 20000 && Math.random() < 0.2) {
        entry.isActive = true;
        entry.duration = 0;
        entry.createdAt = now;
      }
      return;
    }

    entry.lastTick = now;

    // 約 70% 的機率更新時長，否則保持不變以觸發「通話結束」狀態
    if (Math.random() < 0.7) {
      const increment = 2 + Math.floor(Math.random() * 5);
      entry.duration += increment;
    } else if (Math.random() < 0.15) {
      // 讓部分通話提前結束
      entry.isActive = false;
    }
  });

  return mockEntries.map((entry) => ({
    calledNumber: entry.calledNumber,
    agent: entry.agent,
    duration: entry.duration,
    createdAt: entry.createdAt
  }));
}

function normalizeTimestamp(value?: string | number): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
    const numeric = Number.parseInt(value, 10);
    if (!Number.isNaN(numeric)) {
      return numeric;
    }
  }
  return undefined;
}
