import type { IScoringStrategy } from './ScoringStrategy';
import type { ScoringAlgorithm } from '../domain/Table';
import { AverageScoring } from './AverageScoring';
import { TrimmedAverageScoring } from './TrimmedAverageScoring';

export class ScoringStrategyFactory {
  static create(algorithm: ScoringAlgorithm): IScoringStrategy {
    switch (algorithm) {
      case 'average':
        return new AverageScoring();
      case 'trimmed-average':
        return new TrimmedAverageScoring();
    }
  }
}
