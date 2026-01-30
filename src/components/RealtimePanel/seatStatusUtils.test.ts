import { describe, it, expect } from 'vitest';
import { formatPhoneNumber, getSeatStatusConfig } from './seatStatusUtils';

describe('seatStatusUtils', () => {
  describe('formatPhoneNumber', () => {
    it('should format 10-digit US phone number', () => {
      const result = formatPhoneNumber('5551234567');
      expect(result).toBe('(555) 123-4567');
    });

    it('should format 11-digit US phone number with country code', () => {
      const result = formatPhoneNumber('15551234567');
      expect(result).toBe('+1 (555) 123-4567');
    });

    it('should handle phone number with non-digit characters', () => {
      const result = formatPhoneNumber('+1-555-123-4567');
      expect(result).toBe('+1 (555) 123-4567');
    });

    it('should return original string for invalid format', () => {
      const result = formatPhoneNumber('123');
      expect(result).toBe('123');
    });

    it('should handle empty string', () => {
      const result = formatPhoneNumber('');
      expect(result).toBe('');
    });
  });

  describe('getSeatStatusConfig', () => {
    it('should return correct config for online status', () => {
      const config = getSeatStatusConfig('online');
      expect(config.bgColor).toBe('bg-green-500');
      expect(config.statusText).toBe('上線中');
    });

    it('should return correct config for offline status', () => {
      const config = getSeatStatusConfig('offline');
      expect(config.bgColor).toBe('bg-red-500');
      expect(config.statusText).toBe('離線');
    });

    it('should return correct config for inCall status', () => {
      const config = getSeatStatusConfig('inCall');
      expect(config.bgColor).toBe('bg-blue-500');
      expect(config.statusText).toBe('通話中');
    });

    it('should return correct config for ringing status', () => {
      const config = getSeatStatusConfig('ringing');
      expect(config.bgColor).toBe('bg-purple-500');
      expect(config.statusText).toBe('振鈴中');
    });

    it('should return correct config for disconnected status', () => {
      const config = getSeatStatusConfig('disconnected');
      expect(config.bgColor).toBe('bg-gray-500');
      expect(config.statusText).toBe('斷線');
    });
  });
});
