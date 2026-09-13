import type { PlayerVoteRecord } from '../domain/ScoreResult';

export interface ScoringInput {
  votes: Array<{ value: number; weight: number }>;
}

export interface ScoringOutput {
  result: number;
  votesWithMeta: PlayerVoteRecord[];
}

export interface IScoringStrategy {
  calculate(votes: PlayerVoteRecord[]): ScoringOutput;
}
