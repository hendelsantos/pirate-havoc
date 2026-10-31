import { useCallback, useMemo, useState } from 'react';
import { createGameConfig } from '../game/config/gameConfig';
import type { MatchResult } from '../game/core/types';
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
  const [result, setResult] = useState<MatchResult | null>(null);

  const startMatch = useCallback(() => {
    setMatchConfig(createGameConfig(options));
    setResult(null);
    setScreen('game');
  }, [options]);

  const completeMatch = useCallback((matchResult: MatchResult) => {
    localStorage.setItem(LAST_RESULT_KEY, JSON.stringify(matchResult));
    setResult(matchResult);
    setScreen('result');
  }, []);

  const gameKey = useMemo(() => `${matchConfig.matchDurationSeconds}:${matchConfig.enemySpawnIntervalSeconds}`, [matchConfig]);

  if (screen === 'options') return <OptionsScreen options={options} onSave={saveOptions} onBack={() => setScreen('menu')} />;
  if (screen === 'game') return <GameScreen key={gameKey} config={matchConfig} onExit={() => setScreen('menu')} onComplete={completeMatch} />;
  if (screen === 'result' && result) return <ResultScreen result={result} onPlayAgain={startMatch} onMenu={() => setScreen('menu')} />;
  return <MenuScreen onPlay={startMatch} onOptions={() => setScreen('options')} />;
}

