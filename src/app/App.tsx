import { useCallback, useMemo, useState } from 'react';
import { createGameConfig } from '../game/config/gameConfig';
import type { MatchResult } from '../game/core/types';
import type { MatchRecord } from '../api/contracts';
import { compatibilityKey, resultToRecord } from '../api/contracts';
import { addPendingRecord } from '../api/pending';
import { getPlayer } from '../api/player';
import { useLocalOptions } from '../hooks/useLocalOptions';
import { GameScreen } from '../screens/GameScreen';
import { MenuScreen } from '../screens/MenuScreen';
import { OptionsScreen } from '../screens/OptionsScreen';
import { ResultScreen } from '../screens/ResultScreen';

type Screen = 'menu' | 'options' | 'game' | 'result';
const LAST_RESULT_KEY = 'pirate-havoc:last-result:v1';

export function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [options, saveOptions] = useLocalOptions();
  const [matchConfig, setMatchConfig] = useState(() => createGameConfig(options));
  const [result, setResult] = useState<MatchRecord | null>(null);

  const startMatch = useCallback(() => {
    setMatchConfig(createGameConfig(options));
    setResult(null);
    setScreen('game');
  }, [options]);

  const completeMatch = useCallback((matchResult: MatchResult) => {
    const record = resultToRecord(matchResult, getPlayer());
    localStorage.setItem(LAST_RESULT_KEY, JSON.stringify(record));
    addPendingRecord(record);
    setResult(record);
    setScreen('result');
  }, []);

  const gameKey = useMemo(() => `${matchConfig.matchDurationSeconds}:${matchConfig.enemySpawnIntervalSeconds}`, [matchConfig]);

  if (screen === 'options') return <OptionsScreen options={options} onSave={saveOptions} onBack={() => setScreen('menu')} />;
  if (screen === 'game') return <GameScreen key={gameKey} config={matchConfig} onExit={() => setScreen('menu')} onComplete={completeMatch} />;
  if (screen === 'result' && result) return <ResultScreen result={result} onPlayAgain={startMatch} onMenu={() => setScreen('menu')} />;
  return <MenuScreen compatibility={compatibilityKey(createGameConfig(options))} onPlay={startMatch} onOptions={() => setScreen('options')} />;
}

