import { formatHours } from './formatHours';

describe('formatHours', () => {
  it('formats whole hours', () => {
    expect(formatHours(2)).toBe('2h');
    expect(formatHours(10)).toBe('10h');
  });

  it('formats minutes only when less than 1 hour', () => {
    expect(formatHours(0.5)).toBe('30m');
    expect(formatHours(0.25)).toBe('15m');
    expect(formatHours(0.1)).toBe('6m');
  });

  it('formats hours and minutes', () => {
    expect(formatHours(6.5)).toBe('6h 30m');
    expect(formatHours(10.25)).toBe('10h 15m');
    expect(formatHours(6.8)).toBe('6h 48m');
    expect(formatHours(1.75)).toBe('1h 45m');
  });

  it('formats zero', () => {
    expect(formatHours(0)).toBe('0m');
  });

  it('rounds minutes correctly', () => {
    // 6.2 → 6h 12m  (not 6h 11.99...m)
    expect(formatHours(6.2)).toBe('6h 12m');
    // 6.8 → 6h 48m
    expect(formatHours(6.8)).toBe('6h 48m');
  });
});
