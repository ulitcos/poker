import { TrimmedAverageScoring } from './TrimmedAverageScoring';
import type { PlayerVoteRecord } from '../domain/ScoreResult';

function makeVote(playerId: string, value: number, weight = 1): PlayerVoteRecord {
  return { playerId, playerName: playerId, value, weight, isDropped: false };
}

describe('TrimmedAverageScoring', () => {
  const strategy = new TrimmedAverageScoring();

  it('returns plain average for 2 or fewer votes', () => {
    const votes = [makeVote('p1', 2), makeVote('p2', 8)];
    expect(strategy.calculate(votes).result).toBe(5);
  });

  it('drops min and max with 3+ votes', () => {
    const votes = [makeVote('p1', 2), makeVote('p2', 5), makeVote('p3', 8)];
    // drop 2 and 8, only 5 remains → result = 5
    const output = strategy.calculate(votes);
    expect(output.result).toBe(5);
  });

  it('marks dropped votes correctly', () => {
    const votes = [makeVote('p1', 2), makeVote('p2', 5), makeVote('p3', 8)];
    const output = strategy.calculate(votes);
    const dropped = output.votesWithMeta.filter((v) => v.isDropped).map((v) => v.value);
    expect(dropped).toContain(2);
    expect(dropped).toContain(8);
  });

  it('does not mark middle vote as dropped', () => {
    const votes = [makeVote('p1', 2), makeVote('p2', 5), makeVote('p3', 8)];
    const output = strategy.calculate(votes);
    const p2 = output.votesWithMeta.find((v) => v.playerId === 'p2')!;
    expect(p2.isDropped).toBe(false);
  });

  it('applies weights to remaining votes', () => {
    const votes = [makeVote('p1', 1), makeVote('p2', 4, 2), makeVote('p3', 9)];
    // drop 1 and 9, remaining: p2 with value=4, weight=2 → result = 4
    expect(strategy.calculate(votes).result).toBe(4);
  });

  it('handles case where min === max player', () => {
    const votes = [makeVote('p1', 5), makeVote('p2', 5), makeVote('p3', 5)];
    // all same, min and max are first/last sorted entries
    const output = strategy.calculate(votes);
    expect(output.result).toBeGreaterThanOrEqual(0);
  });
});
