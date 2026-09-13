import type { IScoringStrategy, ScoringOutput } from './ScoringStrategy';
import type { PlayerVoteRecord } from '../domain/ScoreResult';

export class AverageScoring implements IScoringStrategy {
  calculate(votes: PlayerVoteRecord[]): ScoringOutput {
    const activeVotes = votes.filter((v) => !v.isDropped);

    if (activeVotes.length === 0) {
      return {
        result: 0,
        votesWithMeta: votes.map((v) => ({ ...v, isDropped: false })),
      };
    }

    const weightedSum = activeVotes.reduce((sum, v) => sum + v.value * v.weight, 0);
    const average = weightedSum / activeVotes.length;

    return {
      result: Math.round(average * 10) / 10,
      votesWithMeta: votes.map((v) => ({ ...v, isDropped: false })),
    };
  }
}
