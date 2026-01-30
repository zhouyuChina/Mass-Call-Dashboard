import { describe, it, expect } from 'vitest';
import {
  buildDialNumberFromSource,
  deriveCallStatus,
  extractSourceLabel,
  normalizeWebpageRecords,
  mergeSummaries,
  parseWebpageEntries
} from './dataTransformers';
import type { ApiWebpageRecord } from '../../types';

describe('dataTransformers', () => {
  describe('buildDialNumberFromSource', () => {
    it('should extract 10 digits from source with enough digits', () => {
      const result = buildDialNumberFromSource('12345678901234', 0);
      expect(result).toBe('1234567890');
      expect(result).toHaveLength(10);
    });

    it('should pad with zeros if source has fewer than 10 digits', () => {
      const result = buildDialNumberFromSource('abc123def', 5);
      expect(result).toHaveLength(10);
      expect(result.startsWith('123')).toBe(true);
    });

    it('should handle source with no digits', () => {
      const result = buildDialNumberFromSource('abcdef', 0);
      expect(result).toHaveLength(10);
      expect(result).toMatch(/^\d{10}$/);
    });

    it('should use seed for uniqueness', () => {
      const result1 = buildDialNumberFromSource('test', 1);
      const result2 = buildDialNumberFromSource('test', 2);
      expect(result1).not.toBe(result2);
    });
  });

  describe('deriveCallStatus', () => {
    it('should return "通話中" for status code >= 500', () => {
      expect(deriveCallStatus(500, 0)).toBe('通話中');
      expect(deriveCallStatus(503, 0)).toBe('通話中');
    });

    it('should return "轉座席" for status code >= 400 and < 500', () => {
      expect(deriveCallStatus(400, 0)).toBe('轉座席');
      expect(deriveCallStatus(404, 0)).toBe('轉座席');
    });

    it('should return "通話中" for index divisible by 4 when no status code', () => {
      expect(deriveCallStatus(undefined, 0)).toBe('通話中');
      expect(deriveCallStatus(undefined, 4)).toBe('通話中');
      expect(deriveCallStatus(undefined, 8)).toBe('通話中');
    });

    it('should return "主打撥打" for other indices when no status code', () => {
      expect(deriveCallStatus(undefined, 1)).toBe('主打撥打');
      expect(deriveCallStatus(undefined, 2)).toBe('主打撥打');
      expect(deriveCallStatus(undefined, 3)).toBe('主打撥打');
    });
  });

  describe('extractSourceLabel', () => {
    it('should extract hostname from valid URL', () => {
      const page: ApiWebpageRecord = {
        id: '1',
        url: 'http://example.com/path',
        domain: '',
        content: '',
        recordType: 'test'
      };
      const result = extractSourceLabel(page, 0);
      expect(result).toBe('example.com');
    });

    it('should extract hostname with port from URL', () => {
      const page: ApiWebpageRecord = {
        id: '1',
        url: 'http://example.com:8080/path',
        domain: '',
        content: '',
        recordType: 'test'
      };
      const result = extractSourceLabel(page, 0);
      expect(result).toBe('example.com:8080');
    });

    it('should use domain if URL parsing fails', () => {
      const page: ApiWebpageRecord = {
        id: '1',
        url: 'invalid-url',
        domain: 'fallback-domain',
        content: '',
        recordType: 'test'
      };
      const result = extractSourceLabel(page, 0);
      expect(result).toBe('fallback-domain');
    });

    it('should generate default label if no URL or domain', () => {
      const page: ApiWebpageRecord = {
        id: '1',
        url: '',
        domain: '',
        content: '',
        recordType: 'test'
      };
      const result = extractSourceLabel(page, 5);
      expect(result).toBe('聯調來源6');
    });
  });

  describe('normalizeWebpageRecords', () => {
    it('should return empty array for empty input', () => {
      const result = normalizeWebpageRecords([]);
      expect(result).toEqual([]);
    });

    it('should normalize single webpage record', () => {
      const webpages: ApiWebpageRecord[] = [
        {
          id: '1',
          url: 'http://example.com/test',
          domain: 'example.com',
          content: 'Test content',
          recordType: 'test',
          title: 'Test Title',
          capturedAt: '2024-01-01T10:00:00Z'
        }
      ];

      const result = normalizeWebpageRecords(webpages);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('integration-1');
      expect(result[0].calledNumber).toHaveLength(10);
      expect(result[0].agent).toBe(1);
      expect(result[0].note).toBe('Test Title');
      expect(result[0].panel).toBe('example.com');
      expect(result[0].integrationSource).toBe('example.com');
    });

    it('should calculate duration based on content length', () => {
      const webpages: ApiWebpageRecord[] = [
        {
          id: '1',
          url: 'http://example.com',
          domain: 'example.com',
          content: 'a'.repeat(600), // 600 chars -> duration = 100
          recordType: 'test'
        }
      ];

      const result = normalizeWebpageRecords(webpages);
      expect(result[0].duration).toBe(100);
    });

    it('should include transcript if content exists', () => {
      const webpages: ApiWebpageRecord[] = [
        {
          id: '1',
          url: 'http://example.com',
          domain: 'example.com',
          content: 'Test transcript content',
          recordType: 'test'
        }
      ];

      const result = normalizeWebpageRecords(webpages);
      expect(result[0].transcript).toBeDefined();
      expect(result[0].transcript?.chinese).toBe('Test transcript content');
      expect(result[0].transcript?.isTranslated).toBe(false);
    });

    it('should handle multiple records with different agents', () => {
      const webpages: ApiWebpageRecord[] = Array.from({ length: 25 }, (_, i) => ({
        id: `${i}`,
        url: `http://example.com/${i}`,
        domain: 'example.com',
        content: 'content',
        recordType: 'test'
      }));

      const result = normalizeWebpageRecords(webpages);
      expect(result).toHaveLength(25);
      expect(result[0].agent).toBe(1);
      expect(result[20].agent).toBe(1); // (20 % 20) + 1
      expect(result[21].agent).toBe(2); // (21 % 20) + 1
    });
  });

  describe('mergeSummaries', () => {
    it('should merge two empty summaries', () => {
      const a = {
        manualCalls: 0,
        segmentCounts: { segment1: 0, segment2: 0, segment3: 0, segment4: 0 },
        voiceCallCount: 0
      };
      const b = {
        manualCalls: 0,
        segmentCounts: { segment1: 0, segment2: 0, segment3: 0, segment4: 0 },
        voiceCallCount: 0
      };

      const result = mergeSummaries(a, b);

      expect(result.manualCalls).toBe(0);
      expect(result.voiceCallCount).toBe(0);
      expect(result.segmentCounts.segment1).toBe(0);
    });

    it('should sum manual calls and voice call counts', () => {
      const a = {
        manualCalls: 10,
        segmentCounts: { segment1: 1, segment2: 2, segment3: 3, segment4: 4 },
        voiceCallCount: 50
      };
      const b = {
        manualCalls: 20,
        segmentCounts: { segment1: 5, segment2: 6, segment3: 7, segment4: 8 },
        voiceCallCount: 30
      };

      const result = mergeSummaries(a, b);

      expect(result.manualCalls).toBe(30);
      expect(result.voiceCallCount).toBe(80);
      expect(result.segmentCounts.segment1).toBe(6);
      expect(result.segmentCounts.segment2).toBe(8);
      expect(result.segmentCounts.segment3).toBe(10);
      expect(result.segmentCounts.segment4).toBe(12);
    });

    it('should average connect rates with samples', () => {
      const a = {
        manualCalls: 0,
        segmentCounts: { segment1: 0, segment2: 0, segment3: 0, segment4: 0 },
        voiceCallCount: 0,
        connectRate: 75.0,
        connectRateSamples: 2
      };
      const b = {
        manualCalls: 0,
        segmentCounts: { segment1: 0, segment2: 0, segment3: 0, segment4: 0 },
        voiceCallCount: 0,
        connectRate: 85.0,
        connectRateSamples: 3
      };

      const result = mergeSummaries(a, b);

      // (75 * 2 + 85 * 3) / 5 = 81
      expect(result.connectRate).toBeCloseTo(81.0, 1);
      expect(result.connectRateSamples).toBe(5);
    });

    it('should handle undefined rates', () => {
      const a = {
        manualCalls: 0,
        segmentCounts: { segment1: 0, segment2: 0, segment3: 0, segment4: 0 },
        voiceCallCount: 0
      };
      const b = {
        manualCalls: 0,
        segmentCounts: { segment1: 0, segment2: 0, segment3: 0, segment4: 0 },
        voiceCallCount: 0,
        connectRate: 80.0,
        connectRateSamples: 1
      };

      const result = mergeSummaries(a, b);

      expect(result.connectRate).toBe(80.0);
      expect(result.connectRateSamples).toBe(1);
    });
  });

  describe('parseWebpageEntries', () => {
    it('should return empty array for empty input', () => {
      const result = parseWebpageEntries([]);
      expect(result).toEqual([]);
    });

    it('should skip non-target pages', () => {
      const webpages: ApiWebpageRecord[] = [
        {
          id: '1',
          url: 'http://example.com/other.php',
          domain: 'example.com',
          content: '<div>Not a target page</div>',
          recordType: 'other'
        }
      ];

      const result = parseWebpageEntries(webpages);
      expect(result).toEqual([]);
    });

    it('should parse get_curcall_in page with table', () => {
      const webpages: ApiWebpageRecord[] = [
        {
          id: '1',
          url: 'http://example.com/get_curcall_in.php?test',
          domain: 'example.com',
          content: `
            <table>
              <thead><tr><th>人工通話：50</th></tr></thead>
              <tbody>
                <tr>
                  <td>1</td><td>1234567890</td><td>0987654321</td>
                  <td>通話中</td><td>2024-01-01 10:00</td><td>00:05:30</td>
                </tr>
              </tbody>
            </table>
          `,
          recordType: 'get_curcall_in',
          capturedAt: '2024-01-01T10:00:00Z'
        }
      ];

      const result = parseWebpageEntries(webpages);

      expect(result).toHaveLength(1);
      expect(result[0].source).toBe('example.com');
      expect(result[0].calls).toHaveLength(1);
      expect(result[0].summary.manualCalls).toBe(50);
    });

    it('should parse get_peer_status page', () => {
      const webpages: ApiWebpageRecord[] = [
        {
          id: '1',
          url: 'http://example.com/get_peer_status.php',
          domain: 'example.com',
          content: `
            綠色-待機<br/>
            <font color="green">1</font>
            <font color="red">2</font>
          `,
          recordType: 'get_peer_status',
          capturedAt: '2024-01-01T10:00:00Z'
        }
      ];

      const result = parseWebpageEntries(webpages);

      expect(result).toHaveLength(1);
      expect(result[0].seatStatuses).toBeDefined();
      expect(result[0].seatStatuses).toHaveLength(1);
      expect(result[0].seatStatuses![0]).toHaveLength(2);
    });

    it('should merge multiple pages from same source', () => {
      const webpages: ApiWebpageRecord[] = [
        {
          id: '1',
          url: 'http://example.com/get_curcall_in.php',
          domain: 'example.com',
          content: `
            <table>
              <thead><tr><th>人工通話：30</th></tr></thead>
              <tbody>
                <tr><td>1</td><td>1111111111</td><td>2222222222</td><td>通話中</td><td>2024-01-01 10:00</td><td>00:05:30</td></tr>
              </tbody>
            </table>
          `,
          recordType: 'get_curcall_in'
        },
        {
          id: '2',
          url: 'http://example.com/get_curcall_in.php',
          domain: 'example.com',
          content: `
            <table>
              <thead><tr><th>人工通話：20</th></tr></thead>
              <tbody>
                <tr><td>2</td><td>3333333333</td><td>4444444444</td><td>主打撥打</td><td>2024-01-01 11:00</td><td>00:03:20</td></tr>
              </tbody>
            </table>
          `,
          recordType: 'get_curcall_in'
        }
      ];

      const result = parseWebpageEntries(webpages);

      expect(result).toHaveLength(1);
      expect(result[0].calls).toHaveLength(2);
      expect(result[0].summary.manualCalls).toBe(50); // 30 + 20
    });

    it('should extract campaign rates from HTML', () => {
      const webpages: ApiWebpageRecord[] = [
        {
          id: '1',
          url: 'http://example.com/cont_controler.php',
          domain: 'example.com',
          content: `
            <table>
              <tbody>
                <tr><td>1</td><td>2</td><td>3</td><td>4</td><td>5</td><td>6</td><td>接通：75.5% 回撥：25.3%</td></tr>
              </tbody>
            </table>
          `,
          recordType: 'cont_controler'
        }
      ];

      const result = parseWebpageEntries(webpages);

      expect(result).toHaveLength(1);
      expect(result[0].summary.connectRate).toBe(75.5);
      expect(result[0].summary.callbackRate).toBe(25.3);
    });
  });
});

