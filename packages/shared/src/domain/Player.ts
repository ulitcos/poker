export type PlayerId = string;

export type PlayerStatus = 'online' | 'offline';

export type VotingParticipationStatus = 'pending' | 'voted';

export interface Player {
  readonly id: PlayerId;
  readonly name: string;
  status: PlayerStatus;
  canVote: boolean;
  voteWeight: number;
  votingStatus: VotingParticipationStatus | null;
  isAdmin: boolean;
}

export interface IPlayerRepository {
  findById(id: PlayerId): Player | undefined;
  findAll(): Player[];
  save(player: Player): void;
  delete(id: PlayerId): void;
}
