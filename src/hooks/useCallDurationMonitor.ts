import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CallDurationApiEntry,
  fetchCallDurationSnapshot
} from '../utils/callDurationService';

export type CallDurationStatus = '一段座席' | '通話結束';

export interface LiveCallDurationRecord extends CallDurationApiEntry {
  status: CallDurationStatus;
  lastChangedAt: number;
  createdAt: number;
}

interface Options {
  pollIntervalMs?: number;
}

const DEFAULT_POLL_INTERVAL = 5000;

export function useCallDurationMonitor(options: Options = {}) {
  const pollInterval = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL;
  const [records, setRecords] = useState<LiveCallDurationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const stateRef = useRef<Map<string, LiveCallDurationRecord>>(new Map());

  useEffect(() => {
    let isMounted = true;
    let timerId: number | undefined;

    async function poll() {
      if (!isMounted) return;
      setIsLoading(true);
      try {
        const snapshot = await fetchCallDurationSnapshot();
        if (!isMounted) return;

        const now = Date.now();
        const nextState = new Map(stateRef.current);
        const seenKeys = new Set<string>();

        snapshot.forEach((entry) => {
          const normalizedNumber = entry.calledNumber?.replace(/\D/g, '');
          if (!normalizedNumber) return;
          const agent = entry.agent ?? 0;
          if (!agent) return;
          const key = buildRecordKey(normalizedNumber, agent);

          seenKeys.add(key);
          const previous = nextState.get(key);
          const duration = Math.max(0, Math.floor(entry.duration || 0));
          const hasChanged = !previous || duration !== previous.duration;
          const firstSeenAt = entry.createdAt ?? previous?.createdAt ?? now;

          nextState.set(key, {
            calledNumber: normalizedNumber,
            agent,
            duration,
            status: hasChanged ? '一段座席' : previous?.status ?? '一段座席',
            lastChangedAt: hasChanged ? now : previous?.lastChangedAt ?? now,
            createdAt: previous?.createdAt ?? firstSeenAt
          });
        });

        // 更新狀態：若在一個輪詢周期內未更新時長則視為通話結束
        nextState.forEach((value, key) => {
          if (!seenKeys.has(key)) {
            if (value.status !== '通話結束') {
              nextState.set(key, { ...value, status: '通話結束' });
            }
            return;
          }

          if (value.status !== '通話結束' && now - value.lastChangedAt >= pollInterval) {
            nextState.set(key, { ...value, status: '通話結束' });
          }
        });

        stateRef.current = nextState;
        setRecords(sortRecords(nextState));
        setError(null);
        setLastSyncedAt(new Date(now));
      } catch (err) {
        if (!isMounted) return;
        const message = err instanceof Error ? err.message : '取得通話時長失敗';
        setError(message);
      } finally {
        if (!isMounted) return;
        setIsLoading(false);
        timerId = window.setTimeout(poll, pollInterval);
      }
    }

    poll();

    return () => {
      isMounted = false;
      if (timerId) {
        window.clearTimeout(timerId);
      }
    };
  }, [pollInterval]);

  const activeCalls = useMemo(() => records.filter((record) => record.status === '一段座席'), [records]);

  return {
    records,
    activeCalls,
    isLoading,
    error,
    lastSyncedAt
  };
}

function buildRecordKey(calledNumber: string, agent: number): string {
  return `${calledNumber}-${agent}`;
}

function sortRecords(records: Map<string, LiveCallDurationRecord>): LiveCallDurationRecord[] {
  return Array.from(records.values()).sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === '一段座席' ? -1 : 1;
    }

    if (a.status === '一段座席' && b.status === '一段座席') {
      return b.duration - a.duration;
    }

    return b.lastChangedAt - a.lastChangedAt;
  });
}
