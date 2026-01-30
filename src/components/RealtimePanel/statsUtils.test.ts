import { describe, it, expect } from 'vitest';
import { formatCallDuration, calculateAverageDuration } from './statsUtils';

describe('statsUtils', () => {
  describe('formatCallDuration', () => {
    it('should format seconds only', () => {
      expect(formatCallDuration(45)).toBe('45秒');
    });

    it('should format minutes and seconds', () => {
      expect(formatCallDuration(125)).toBe('2分5秒');
    });

    it('should format hours, minutes and seconds', () => {
      expect(formatCallDuration(3665)).toBe('1小時1分5秒');
    });

    it('should handle zero seconds', () => {
      expect(formatCallDuration(0)).toBe('0秒');
    });

    it('should handle exactly 1 minute', () => {
      expect(formatCallDuration(60)).toBe('1分0秒');
    });

    it('should handle exactly 1 hour', () => {
      expect(formatCallDuration(3600)).toBe('1小時0分0秒');
    });

    it('should omit zero minutes when hours present', () => {
      expect(formatCallDuration(3605)).toBe('1小時0分5秒');
    });
  });

  describe('calculateAverageDuration', () => {
    it('should calculate average from array of durations', () => {
      const durations = [60, 120, 180];
      expect(calculateAverageDuration(durations)).toBe(120);
    });

    it('should return 0 for empty array', () => {
      expect(calculateAverageDuration([])).toBe(0);
    });

    it('should handle single duration', () => {
      expect(calculateAverageDuration([100])).toBe(100);
    });

    it('should round down to nearest integer', () => {
      const durations = [100, 101, 102];
      expect(calculateAverageDuration(durations)).toBe(101);
    });

    it('should handle large numbers', () => {
      const durations = [10000, 20000, 30000];
      expect(calculateAverageDuration(durations)).toBe(20000);
    });
  });
});
