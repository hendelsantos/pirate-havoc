import type { GameConfig } from '../game/config/gameConfig';
import type { EndReason, MatchResult } from '../game/core/types';

export interface PlayerIdentity {
  readonly id: string;
  readonly name: string;
}

export interface MatchRecord {
  readonly matchId: string;
  readonly playerId: string;
  readonly playerName: string;
  readonly timestamp: string;
  readonly score: number;
  readonly activeDurationSeconds: number;
  readonly endReason: EndReason;
  readonly config: GameConfig;
  readonly compatibilityKey: string;
}

export interface PageResponse<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly totalPages: number;
}

export type NetworkScenario =
  | 'success'
  | 'empty'
  | 'slow'
  | 'variable-latency'
  | 'connection-failure'
  | 'http-400'
  | 'http-500'
  | 'ranking-failure'
  | 'history-failure'
  | 'timeout-after-registration';

export const NETWORK_SCENARIOS: readonly NetworkScenario[] = [
  'success',
  'empty',
  'slow',
  'variable-latency',
  'connection-failure',
  'http-400',
  'http-500',
  'ranking-failure',
  'history-failure',
  'timeout-after-registration',
];

export function compatibilityKey(config: GameConfig): string {
  return `duration:${config.matchDurationSeconds}|spawn:${config.enemySpawnIntervalSeconds}`;
}

export function resultToRecord(result: MatchResult, player: PlayerIdentity): MatchRecord {
  return {
    matchId: result.matchId,
    playerId: player.id,
    playerName: player.name,
    timestamp: result.completedAt,
    score: result.score,
    activeDurationSeconds: result.activeDurationSeconds,
    endReason: result.endReason,
    config: result.config,
    compatibilityKey: compatibilityKey(result.config),
  };
}

