import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameConfig } from '../game/config/gameConfig';
import { GameEngine } from '../game/core/GameEngine';
import type { ControlAction, HudSnapshot, MatchResult } from '../game/core/types';
import { TouchControls } from '../components/TouchControls';

interface GameScreenProps {
  readonly config: GameConfig;
  readonly onExit: () => void;
  readonly onComplete: (result: MatchResult) => void;
}

const INITIAL_HUD: HudSnapshot = {
  state: 'LOADING',
  health: 100,
  maxHealth: 100,
  score: 0,
  remainingSeconds: 0,
  projectileCount: 0,
  enemyCount: 0,
};

export function GameScreen({ config, onExit, onComplete }: GameScreenProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [hud, setHud] = useState<HudSnapshot>({ ...INITIAL_HUD, health: config.player.maxHealth, maxHealth: config.player.maxHealth, remainingSeconds: config.matchDurationSeconds });
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadLabel, setLoadLabel] = useState('Preparing the waters');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const engine = new GameEngine(host, config, {
      onHudChange: setHud,
      onMatchEnd: onComplete,
      onLoadProgress: (progress, label) => {
        setLoadProgress(progress);
        setLoadLabel(label);
      },
      onLoadError: (error) => setLoadError(error.message),
    });
    engineRef.current = engine;
    setLoadError(null);
    void engine.initialize();
    return () => {
      engineRef.current = null;
      engine.destroy();
    };
  }, [config, loadAttempt, onComplete]);

  const handleControl = useCallback((action: ControlAction, active: boolean) => {
    engineRef.current?.setControl(action, active);
  }, []);

  return (
    <main className="gameScreen">
      <div className="gameViewport" ref={hostRef} data-testid="game-viewport" />
      <header className="hud" aria-label="Match status">
        <button className="iconButton" type="button" onClick={onExit} aria-label="Abandon match and return to menu">☰</button>
        <div className="hudStat"><span>Hull</span><strong>{hud.health}/{hud.maxHealth}</strong></div>
        <div className="hudScore" aria-live="polite"><span>Bounty</span><strong>{hud.score}</strong></div>
        <div className="hudStat"><span>Time</span><strong>{hud.remainingSeconds}s</strong></div>
        <button className="iconButton" type="button" onClick={() => engineRef.current?.togglePause()} aria-label={hud.state === 'PAUSED' ? 'Resume match' : 'Pause match'}>{hud.state === 'PAUSED' ? '▶' : 'Ⅱ'}</button>
      </header>

      {hud.state === 'LOADING' && !loadError && (
        <section className="gameOverlay loadingPanel" aria-live="polite">
          <span className="eyebrow">Charting course</span>
          <h1>{loadLabel}</h1>
          <progress value={loadProgress} max={1}>{Math.round(loadProgress * 100)}%</progress>
          <p>{Math.round(loadProgress * 100)}%</p>
        </section>
      )}

      {loadError && (
        <section className="gameOverlay loadingPanel" role="alert">
          <span className="eyebrow">Cargo lost</span>
          <h1>Assets failed to load</h1>
          <p>{loadError}</p>
          <button className="primaryButton" type="button" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>Retry loading</button>
          <button className="textButton" type="button" onClick={onExit}>Return to menu</button>
        </section>
      )}

      {hud.state === 'PAUSED' && (
        <section className="gameOverlay pausePanel" role="dialog" aria-modal="true" aria-labelledby="pause-title">
          <span className="eyebrow">Waters still</span>
          <h1 id="pause-title">Match paused</h1>
          <p>{hud.pauseReason === 'FOCUS_LOST' ? 'Focus was lost. Resume when you are ready.' : 'Your active match clock is frozen.'}</p>
          <button className="primaryButton" type="button" autoFocus onClick={() => engineRef.current?.resume()}>Resume battle</button>
          <button className="textButton" type="button" onClick={onExit}>Abandon match</button>
        </section>
      )}

      <TouchControls onControl={handleControl} />
      <p className="desktopControls" aria-label="Keyboard controls">W / ↑ sail · A D turn · Space fire · Q E broadsides · Esc pause</p>
      <div className="srOnly" aria-live="polite">Score {hud.score}. Health {hud.health}. {hud.remainingSeconds} seconds remaining. Match {hud.state.toLowerCase()}.</div>
    </main>
  );
}

