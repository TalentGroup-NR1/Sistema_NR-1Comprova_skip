import { describe, it, expect } from 'vitest';
import { hexToHslString, getForegroundHslFromHex } from '../colorUtils';

describe('colorUtils', () => {
  describe('hexToHslString', () => {
    it('converts #C8102E to correct HSL format', () => {
      // #C8102E -> hsl(350, 85%, 42%) approx.
      const hsl = hexToHslString('#C8102E');
      expect(hsl).toBe('350 85% 42%');
    });

    it('converts #000000 to correct HSL format', () => {
      const hsl = hexToHslString('#000000');
      expect(hsl).toBe('0 0% 0%');
    });

    it('converts #FFFFFF to correct HSL format', () => {
      const hsl = hexToHslString('#FFFFFF');
      expect(hsl).toBe('0 0% 100%');
    });

    it('handles 3-digit hex', () => {
      const hsl = hexToHslString('#FFF');
      expect(hsl).toBe('0 0% 100%');
    });

    it('handles missing hash', () => {
      const hsl = hexToHslString('C8102E');
      expect(hsl).toBe('350 85% 42%');
    });
  });

  describe('getForegroundHslFromHex', () => {
    it('returns white foreground for dark background (#C8102E)', () => {
      const fg = getForegroundHslFromHex('#C8102E');
      expect(fg).toBe('0 0% 100%');
    });

    it('returns white foreground for black background (#000000)', () => {
      const fg = getForegroundHslFromHex('#000000');
      expect(fg).toBe('0 0% 100%');
    });

    it('returns black foreground for white background (#FFFFFF)', () => {
      const fg = getForegroundHslFromHex('#FFFFFF');
      expect(fg).toBe('0 0% 0%');
    });
  });
});
