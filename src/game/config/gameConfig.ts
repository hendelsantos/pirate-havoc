export interface GameConfig {
  readonly arena: {
    readonly width: number;
    readonly height: number;
  };
  readonly matchDurationSeconds: number;
  readonly enemySpawnIntervalSeconds: number;
  readonly player: {
    readonly maxHealth: number;
    readonly speed: number;
    readonly rotationSpeed: number;
    readonly radius: number;
  };
  readonly projectile: {
    readonly speed: number;
    readonly damage: number;
    readonly lifetimeSeconds: number;
    readonly radius: number;
    readonly frontCooldownSeconds: number;
  };
}

export interface GameOptions {
  readonly matchDurationSeconds: number;
  readonly enemySpawnIntervalSeconds: number;
  readonly soundEnabled: boolean;
}

export const OPTION_LIMITS = {
  matchDuration: { min: 60, max: 180, step: 10 },
  spawnInterval: { min: 2, max: 15, step: 0.5 },
} as const;

export const DEFAULT_OPTIONS: GameOptions = {
  matchDurationSeconds: 120,
  enemySpawnIntervalSeconds: 4,
  soundEnabled: true,
};

const BASE_CONFIG: Omit<GameConfig, 'matchDurationSeconds' | 'enemySpawnIntervalSeconds'> = {
  arena: { width: 1280, height: 720 },
  player: {
    maxHealth: 100,
    speed: 210,
    rotationSpeed: 2.65,
    radius: 28,
  },
  projectile: {
    speed: 620,
    damage: 25,
    lifetimeSeconds: 1.8,
    radius: 7,
    frontCooldownSeconds: 0.42,
  },
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function validateOptions(options: GameOptions): GameOptions {
  return {
    matchDurationSeconds: clamp(
      Math.round(options.matchDurationSeconds / OPTION_LIMITS.matchDuration.step) * OPTION_LIMITS.matchDuration.step,
      OPTION_LIMITS.matchDuration.min,
      OPTION_LIMITS.matchDuration.max,
    ),
    enemySpawnIntervalSeconds: clamp(
      Math.round(options.enemySpawnIntervalSeconds / OPTION_LIMITS.spawnInterval.step) * OPTION_LIMITS.spawnInterval.step,
      OPTION_LIMITS.spawnInterval.min,
      OPTION_LIMITS.spawnInterval.max,
    ),
    soundEnabled: options.soundEnabled,
  };
}

export function createGameConfig(options: GameOptions): Readonly<GameConfig> {
  const valid = validateOptions(options);
  return Object.freeze({
    ...BASE_CONFIG,
    arena: Object.freeze({ ...BASE_CONFIG.arena }),
    player: Object.freeze({ ...BASE_CONFIG.player }),
    projectile: Object.freeze({ ...BASE_CONFIG.projectile }),
    matchDurationSeconds: valid.matchDurationSeconds,
    enemySpawnIntervalSeconds: valid.enemySpawnIntervalSeconds,
  });
}

