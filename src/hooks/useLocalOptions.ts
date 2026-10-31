import { useCallback, useState } from 'react';
import { DEFAULT_OPTIONS, validateOptions, type GameOptions } from '../game/config/gameConfig';

const STORAGE_KEY = 'pirate-havoc:options:v1';

function readOptions(): GameOptions {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_OPTIONS;
    return validateOptions({ ...DEFAULT_OPTIONS, ...(JSON.parse(stored) as Partial<GameOptions>) });
  } catch {
    return DEFAULT_OPTIONS;
  }
}

export function useLocalOptions(): readonly [GameOptions, (options: GameOptions) => void] {
  const [options, setOptions] = useState<GameOptions>(readOptions);
  const save = useCallback((next: GameOptions): void => {
    const valid = validateOptions(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
    setOptions(valid);
  }, []);
  return [options, save] as const;
}

