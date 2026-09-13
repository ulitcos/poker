import { AverageScoring } from './AverageScoring';
import type { PlayerVoteRecord } from '../domain/ScoreResult';

function vote(playerId: string, value: number, weight = 1): PlayerVoteRecord {
  return { playerId, playerName: playerId, value, weight, isDropped: false };
}

describe('AverageScoring', () => {
  const strategy = new AverageScoring();

  it('returns 0 for empty votes', () => {
    expect(strategy.calculate([]).result).toBe(0);
  });

  it('calculates simple average with equal weights', () => {
    // (4×1 + 8×1) / 2 = 6
    expect(strategy.calculate([vote('p1', 4), vote('p2', 8)]).result).toBe(6);
  });

  it('divides weightedSum by participant count, not sum of weights', () => {
    // (4×1.0 + 8×1.2) / 2 = (4 + 9.6) / 2 = 13.6 / 2 = 6.8
    expect(strategy.calculate([vote('p1', 4, 1.0), vote('p2', 8, 1.2)]).result).toBe(6.8);
  });

  it('rounds to tenths', () => {
    // (1×1 + 2×1 + 3×1) / 3 = 2.0
    expect(strategy.calculate([vote('p1', 1), vote('p2', 2), vote('p3', 3)]).result).toBe(2);
  });

  it('rounds to tenths when result is not exact', () => {
    // (1×1 + 2×1) / 2 = 1.5
    expect(strategy.calculate([vote('p1', 1), vote('p2', 2)]).result).toBe(1.5);
  });

  it('zero weight contributes 0 to weightedSum', () => {
    // (4×0) / 1 = 0
    expect(strategy.calculate([vote('p1', 4, 0)]).result).toBe(0);
  });

  it('marks no votes as dropped', () => {
    const output = strategy.calculate([vote('p1', 4), vote('p2', 8)]);
    expect(output.votesWithMeta.every((v) => !v.isDropped)).toBe(true);
  });

  it('single vote returns that value times weight divided by 1', () => {
    // (5×2.0) / 1 = 10
    expect(strategy.calculate([vote('p1', 5, 2.0)]).result).toBe(10);
  });
});
