import type { GameConfig } from '../config/gameConfig';

export type MatchState = 'LOADING' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';
export type EndReason = 'TIME_EXPIRED' | 'PLAYER_DESTROYED';
export type ControlAction = 'forward' | 'left' | 'right' | 'fireFront' | 'fireLeft' | 'fireRight';

export interface HudSnapshot {
  readonly state: MatchState;
  readonly health: number;
  readonly maxHealth: number;
  readonly score: number;
  readonly remainingSeconds: number;
  readonly projectileCount: number;
  readonly enemyCount: number;
  readonly pauseReason?: 'MANUAL' | 'FOCUS_LOST';
}

export interface MatchResult {
  readonly matchId: string;
  readonly score: number;
  readonly activeDurationSeconds: number;
  readonly endReason: EndReason;
  readonly completedAt: string;
  readonly config: GameConfig;
}

export interface GameEngineEvents {
  readonly onHudChange: (snapshot: HudSnapshot) => void;
  readonly onMatchEnd: (result: MatchResult) => void;
  readonly onLoadProgress: (progress: number, label: string) => void;
  readonly onLoadError: (error: Error) => void;
}

