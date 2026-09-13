import { TrimmedAverageScoring } from './TrimmedAverageScoring';
import type { PlayerVoteRecord } from '../domain/ScoreResult';

function vote(playerId: string, value: number, weight = 1): PlayerVoteRecord {
  return { playerId, playerName: playerId, value, weight, isDropped: false };
}

describe('TrimmedAverageScoring', () => {
  const strategy = new TrimmedAverageScoring();

  it('with 1 vote: returns weightedSum / 1', () => {
    // (5×1) / 1 = 5
    expect(strategy.calculate([vote('p1', 5)]).result).toBe(5);
  });

  it('with 2 votes: uses same formula without dropping', () => {
    // (2×1 + 8×1) / 2 = 5
    expect(strategy.calculate([vote('p1', 2), vote('p2', 8)]).result).toBe(5);
  });

  it('with 2 votes and weights: divides by count not sum of weights', () => {
    // (4×1.0 + 8×1.2) / 2 = 13.6 / 2 = 6.8
    expect(strategy.calculate([vote('p1', 4, 1.0), vote('p2', 8, 1.2)]).result).toBe(6.8);
  });

  it('with 3+ votes: drops min and max', () => {
    // drop 2 and 8, remaining: p2=5 weight=1 → (5×1) / 1 = 5
    expect(strategy.calculate([vote('p1', 2), vote('p2', 5), vote('p3', 8)]).result).toBe(5);
  });

  it('marks min and max as dropped', () => {
    const output = strategy.calculate([vote('p1', 2), vote('p2', 5), vote('p3', 8)]);
    const dropped = output.votesWithMeta.filter((v) => v.isDropped).map((v) => v.value);
    expect(dropped).toContain(2);
    expect(dropped).toContain(8);
    expect(output.votesWithMeta.find((v) => v.playerId === 'p2')!.isDropped).toBe(false);
  });

  it('applies weight to remaining votes after dropping', () => {
    // drop p1(1) and p3(9), remaining: p2 value=4 weight=2 → (4×2) / 1 = 8
    expect(strategy.calculate([vote('p1', 1), vote('p2', 4, 2), vote('p3', 9)]).result).toBe(8);
  });

  it('with 4 votes: drops one min and one max', () => {
    // drop p1(1) and p4(10), remaining: p2(4)×1, p3(6)×1 → (4+6) / 2 = 5
    const votes = [vote('p1', 1), vote('p2', 4), vote('p3', 6), vote('p4', 10)];
    expect(strategy.calculate(votes).result).toBe(5);
  });

  it('all same values: drops first and last sorted entries (both), middle remains', () => {
    // sorted: [p1(5), p2(5), p3(5)] → drop p1 and p3, remaining: p2(5)×1 → (5×1)/1 = 5
    const output = strategy.calculate([vote('p1', 5), vote('p2', 5), vote('p3', 5)]);
    expect(output.result).toBe(5);
    const dropped = output.votesWithMeta.filter((v) => v.isDropped);
    expect(dropped.length).toBe(2);
    expect(output.votesWithMeta.find((v) => v.playerId === 'p2')!.isDropped).toBe(false);
  });
});
