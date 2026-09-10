import { describe, it, expect } from 'vitest';
import { normalizeDateToISO, formatHistoricDate, cleanHistoricMessageText } from './dateUtils';

describe('dateUtils', () => {
  describe('normalizeDateToISO', () => {
    it('should format yyyy-MM-dd correctly', () => {
      expect(normalizeDateToISO('2026-09-10')).toBe('2026-09-10');
    });

    it('should reject invalid dates (like 0001-10-01)', () => {
      expect(normalizeDateToISO('0001-10-01')).toBeNull();
      expect(normalizeDateToISO('0026-01-01')).toBeNull();
    });

    it('should handle empty or null', () => {
      expect(normalizeDateToISO('')).toBeNull();
      expect(normalizeDateToISO(null)).toBeNull();
    });
  });

  describe('formatHistoricDate', () => {
    it('should format valid date correctly', () => {
      expect(formatHistoricDate('2026-09-10T14:30:00.000Z')).not.toBe('—');
    });

    it('should return — for invalid or very old dates', () => {
      expect(formatHistoricDate('0001-10-01T00:00:00.000Z')).toBe('—');
      expect(formatHistoricDate('invalid')).toBe('—');
      expect(formatHistoricDate(null)).toBe('—');
    });
  });

  describe('cleanHistoricMessageText', () => {
    it('should replace invalid dates in messages with —', () => {
      expect(cleanHistoricMessageText('Prazo alterado para 0001-10-01')).toBe('Prazo alterado para —');
      expect(cleanHistoricMessageText('Alterou de 0001-10-01 para 2026-12-31')).toBe('Alterou de — para 2026-12-31');
    });

    it('should not modify valid messages', () => {
      expect(cleanHistoricMessageText('Status alterado para concluida')).toBe('Status alterado para concluida');
      expect(cleanHistoricMessageText('Prazo alterado para 2026-05-15')).toBe('Prazo alterado para 2026-05-15');
    });

    it('should handle null or empty', () => {
      expect(cleanHistoricMessageText(null)).toBe('');
      expect(cleanHistoricMessageText('')).toBe('');
    });
  });
});
