import { v4 as uuidv4 } from 'uuid';
import type { Player, PlayerId, IPlayerRepository } from '@planning-poker/shared';

export class PlayerService {
  constructor(private readonly playerRepo: IPlayerRepository) {}

  getOrCreate(name: string, existingId?: PlayerId): Player {
    if (existingId) {
      const existing = this.playerRepo.findById(existingId);
      if (existing) {
        existing.status = 'online';
        this.playerRepo.save(existing);
        return existing;
      }
    }

    const player: Player = {
      id: existingId ?? uuidv4(),
      name,
      status: 'online',
      canVote: true,
      voteWeight: 1,
      votingStatus: null,
      isAdmin: false,
    };
    this.playerRepo.save(player);
    return player;
  }

  setOffline(playerId: PlayerId): void {
    const player = this.playerRepo.findById(playerId);
    if (player) {
      player.status = 'offline';
      this.playerRepo.save(player);
    }
  }

  setOnline(playerId: PlayerId): void {
    const player = this.playerRepo.findById(playerId);
    if (player) {
      player.status = 'online';
      this.playerRepo.save(player);
    }
  }

  updateWeight(playerId: PlayerId, weight: number): Player {
    const player = this.requirePlayer(playerId);
    player.voteWeight = Math.round(weight * 10) / 10;
    this.playerRepo.save(player);
    return player;
  }

  toggleCanVote(playerId: PlayerId, canVote: boolean): Player {
    const player = this.requirePlayer(playerId);
    player.canVote = canVote;
    this.playerRepo.save(player);
    return player;
  }

  findById(playerId: PlayerId): Player | undefined {
    return this.playerRepo.findById(playerId);
  }

  private requirePlayer(playerId: PlayerId): Player {
    const player = this.playerRepo.findById(playerId);
    if (!player) throw new Error(`Player ${playerId} not found`);
    return player;
  }
}
