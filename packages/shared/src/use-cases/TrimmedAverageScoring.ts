import type { IScoringStrategy, ScoringOutput } from './ScoringStrategy';
import type { PlayerVoteRecord } from '../domain/ScoreResult';

export class TrimmedAverageScoring implements IScoringStrategy {
  calculate(votes: PlayerVoteRecord[]): ScoringOutput {
    if (votes.length <= 2) {
      const weightedSum = votes.reduce((sum, v) => sum + v.value * v.weight, 0);
      const totalWeight = votes.reduce((sum, v) => sum + v.weight, 0);
      const average = weightedSum / totalWeight;
      return {
        result: Math.round(average * 10) / 10,
        votesWithMeta: votes.map((v) => ({ ...v, isDropped: false })),
      };
    }

    const sorted = [...votes].sort((a, b) => a.value - b.value);
    const minVote = sorted[0];
    const maxVote = sorted[sorted.length - 1];

    const droppedIds = new Set<string>();
    droppedIds.add(minVote.playerId);
    if (maxVote.playerId !== minVote.playerId) {
      droppedIds.add(maxVote.playerId);
    }

    const activeVotes = votes.filter((v) => !droppedIds.has(v.playerId));

    const weightedSum = activeVotes.reduce((sum, v) => sum + v.value * v.weight, 0);
    const totalWeight = activeVotes.reduce((sum, v) => sum + v.weight, 0);
    const average = weightedSum / totalWeight;

    return {
      result: Math.round(average * 10) / 10,
      votesWithMeta: votes.map((v) => ({ ...v, isDropped: droppedIds.has(v.playerId) })),
    };
  }
}
