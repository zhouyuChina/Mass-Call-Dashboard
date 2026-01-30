import { describe, it, expect } from 'vitest';
import {
  createEmptyMonitorSummary,
  parseCallTable,
  parseCampaignControllerTable,
  parsePeerStatusHtml,
  extractCampaignRates
} from './htmlParser';

describe('htmlParser', () => {
  describe('createEmptyMonitorSummary', () => {
    it('should create empty monitor summary with default values', () => {
      const summary = createEmptyMonitorSummary();

      expect(summary.manualCalls).toBe(0);
      expect(summary.segmentCounts.segment1).toBe(0);
      expect(summary.segmentCounts.segment2).toBe(0);
      expect(summary.segmentCounts.segment3).toBe(0);
      expect(summary.segmentCounts.segment4).toBe(0);
      expect(summary.voiceCallCount).toBe(0);
      expect(summary.connectRate).toBeUndefined();
      expect(summary.callbackRate).toBeUndefined();
      expect(summary.connectRateSamples).toBe(0);
      expect(summary.callbackRateSamples).toBe(0);
    });
  });

  describe('parseCallTable', () => {
    it('should return empty result for empty HTML', () => {
      const result = parseCallTable('');

      expect(result.calls).toEqual([]);
      expect(result.summary).toEqual(createEmptyMonitorSummary());
    });

    it('should return empty result for HTML without table', () => {
      const html = '<div>No table here</div>';
      const result = parseCallTable(html);

      expect(result.calls).toEqual([]);
      expect(result.summary).toEqual(createEmptyMonitorSummary());
    });

    it('should parse summary from table header', () => {
      const html = `
        <table>
          <thead>
            <tr><th>人工通話：50 一段：10 二段：20 三段：15 四段：5 語音通話：100</th></tr>
          </thead>
          <tbody></tbody>
        </table>
      `;
      const result = parseCallTable(html);

      expect(result.summary.manualCalls).toBe(50);
      expect(result.summary.segmentCounts.segment1).toBe(10);
      expect(result.summary.segmentCounts.segment2).toBe(20);
      expect(result.summary.segmentCounts.segment3).toBe(15);
      expect(result.summary.segmentCounts.segment4).toBe(5);
      expect(result.summary.voiceCallCount).toBe(100);
    });

    it('should parse call records from table rows', () => {
      const html = `
        <table>
          <thead><tr><th>Header</th></tr></thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>1234567890</td>
              <td>0987654321</td>
              <td>通話中</td>
              <td>2024-01-01 10:00</td>
              <td>00:05:30</td>
            </tr>
          </tbody>
        </table>
      `;
      const result = parseCallTable(html);

      expect(result.calls).toHaveLength(1);
      expect(result.calls[0].sequence).toBe(1);
      expect(result.calls[0].calledNumber).toBe('1234567890');
      expect(result.calls[0].callbackNumber).toBe('0987654321');
      expect(result.calls[0].callStatus).toBe('通話中');
      expect(result.calls[0].startTime).toBe('2024-01-01 10:00');
      expect(result.calls[0].durationText).toBe('00:05:30');
    });
  });

  describe('parseCampaignControllerTable', () => {
    it('should return empty result for empty HTML', () => {
      const result = parseCampaignControllerTable('');

      expect(result.calls).toEqual([]);
      expect(result.summary).toEqual(createEmptyMonitorSummary());
    });

    it('should extract connect and callback rates', () => {
      const html = `
        <table>
          <tbody>
            <tr>
              <td>1</td><td>2</td><td>3</td><td>4</td><td>5</td><td>6</td>
              <td>接通：75.5% 回撥：25.3%</td>
            </tr>
            <tr>
              <td>1</td><td>2</td><td>3</td><td>4</td><td>5</td><td>6</td>
              <td>接通：80.0% 回撥：30.0%</td>
            </tr>
          </tbody>
        </table>
      `;
      const result = parseCampaignControllerTable(html);

      expect(result.summary.connectRate).toBeCloseTo(77.75, 1); // (75.5 + 80) / 2
      expect(result.summary.callbackRate).toBeCloseTo(27.65, 1); // (25.3 + 30) / 2
      expect(result.summary.connectRateSamples).toBe(2);
      expect(result.summary.callbackRateSamples).toBe(2);
    });
  });

  describe('parsePeerStatusHtml', () => {
    it('should return null for empty HTML', () => {
      const result = parsePeerStatusHtml('');
      expect(result).toBeNull();
    });

    it('should return null for HTML without seat status', () => {
      const html = '<div>No seat status here</div>';
      const result = parsePeerStatusHtml(html);
      expect(result).toBeNull();
    });

    it('should parse seat statuses from HTML', () => {
      const html = `
        綠色-待機<br/>
        <font color="green">1</font>
        <font color="red">2</font>
        <font color="purple">3</font>
        <font color="blue">4</font>
        <font color="grey">5</font>
      `;
      const result = parsePeerStatusHtml(html);

      expect(result).not.toBeNull();
      expect(result).toHaveLength(1); // One row with 5 seats
      expect(result![0]).toHaveLength(5);
      expect(result![0][0]).toEqual({ seatNumber: 1, status: 'online' });
      expect(result![0][1]).toEqual({ seatNumber: 2, status: 'offline' });
      expect(result![0][2]).toEqual({ seatNumber: 3, status: 'ringing' });
      expect(result![0][3]).toEqual({ seatNumber: 4, status: 'inCall' });
      expect(result![0][4]).toEqual({ seatNumber: 5, status: 'disconnected' });
    });

    it('should group seats into rows of 10', () => {
      const html = `
        綠色-待機<br/>
        <font color="green">1</font>
        <font color="green">2</font>
        <font color="green">3</font>
        <font color="green">4</font>
        <font color="green">5</font>
        <font color="green">6</font>
        <font color="green">7</font>
        <font color="green">8</font>
        <font color="green">9</font>
        <font color="green">10</font>
        <font color="green">11</font>
        <font color="green">12</font>
      `;
      const result = parsePeerStatusHtml(html);

      expect(result).not.toBeNull();
      expect(result).toHaveLength(2); // Two rows
      expect(result![0]).toHaveLength(10); // First row has 10 seats
      expect(result![1]).toHaveLength(2); // Second row has 2 seats
    });
  });

  describe('extractCampaignRates', () => {
    it('should return empty object for empty HTML', () => {
      const result = extractCampaignRates('');
      expect(result).toEqual({});
    });

    it('should extract connect and callback rates from text', () => {
      const html = `
        <div>
          接通：75.5%
          回撥：25.3%
        </div>
      `;
      const result = extractCampaignRates(html);

      expect(result.connectRate).toBe(75.5);
      expect(result.callbackRate).toBe(25.3);
      expect(result.connectRateSamples).toBe(1);
      expect(result.callbackRateSamples).toBe(1);
    });

    it('should calculate average for multiple values', () => {
      const html = `
        <div>
          接通：70% 接通：80%
          回撥：20% 回撥：30%
        </div>
      `;
      const result = extractCampaignRates(html);

      expect(result.connectRate).toBe(75); // (70 + 80) / 2
      expect(result.callbackRate).toBe(25); // (20 + 30) / 2
      expect(result.connectRateSamples).toBe(2);
      expect(result.callbackRateSamples).toBe(2);
    });
  });
});
