import { AverageScoring } from './AverageScoring';
import type { PlayerVoteRecord } from '../domain/ScoreResult';

function makeVote(playerId: string, value: number, weight = 1): PlayerVoteRecord {
  return { playerId, playerName: playerId, value, weight, isDropped: false };
}

describe('AverageScoring', () => {
  const strategy = new AverageScoring();

  it('returns 0 for empty votes', () => {
    expect(strategy.calculate([]).result).toBe(0);
  });

  it('calculates simple average', () => {
    const votes = [makeVote('p1', 4), makeVote('p2', 8)];
    expect(strategy.calculate(votes).result).toBe(6);
  });

  it('applies weights correctly', () => {
    const votes = [makeVote('p1', 4, 2), makeVote('p2', 8, 1)];
    // (4*2 + 8*1) / (2+1) = 16/3 ≈ 5.3
    expect(strategy.calculate(votes).result).toBe(5.3);
  });

  it('rounds to tenths', () => {
    const votes = [makeVote('p1', 1), makeVote('p2', 2), makeVote('p3', 3)];
    // (1+2+3)/3 = 2.0
    expect(strategy.calculate(votes).result).toBe(2);
  });

  it('marks no votes as dropped', () => {
    const votes = [makeVote('p1', 4), makeVote('p2', 8)];
    const output = strategy.calculate(votes);
    expect(output.votesWithMeta.every((v) => !v.isDropped)).toBe(true);
  });

  it('handles zero total weight', () => {
    const votes = [makeVote('p1', 4, 0)];
    expect(strategy.calculate(votes).result).toBe(0);
  });
});
