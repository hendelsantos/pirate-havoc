import { useState, type FormEvent } from 'react';
import { OPTION_LIMITS, type GameOptions } from '../game/config/gameConfig';

interface OptionsScreenProps {
  readonly options: GameOptions;
  readonly onSave: (options: GameOptions) => void;
  readonly onBack: () => void;
}

export function OptionsScreen({ options, onSave, onBack }: OptionsScreenProps) {
  const [draft, setDraft] = useState(options);
  const handleSubmit = (event: FormEvent): void => {
    event.preventDefault();
    onSave(draft);
    onBack();
  };

  return (
    <main className="panelScreen">
      <section className="settingsPanel">
        <button className="backButton" type="button" onClick={onBack}>← Main menu</button>
        <span className="eyebrow">Captain's quarters</span>
        <h1>Battle options</h1>
        <p>Saved settings apply to the next match. An active match always keeps its original configuration.</p>
        <form onSubmit={handleSubmit}>
          <label>
            <span>Game session time <strong>{draft.matchDurationSeconds}s</strong></span>
            <input
              type="range"
              min={OPTION_LIMITS.matchDuration.min}
              max={OPTION_LIMITS.matchDuration.max}
              step={OPTION_LIMITS.matchDuration.step}
              value={draft.matchDurationSeconds}
              onChange={(event) => setDraft({ ...draft, matchDurationSeconds: Number(event.target.value) })}
            />
            <small>Valid range: 60–180 seconds of active play.</small>
          </label>
          <label>
            <span>Enemy spawn time <strong>{draft.enemySpawnIntervalSeconds}s</strong></span>
            <input
              type="range"
              min={OPTION_LIMITS.spawnInterval.min}
              max={OPTION_LIMITS.spawnInterval.max}
              step={OPTION_LIMITS.spawnInterval.step}
              value={draft.enemySpawnIntervalSeconds}
              onChange={(event) => setDraft({ ...draft, enemySpawnIntervalSeconds: Number(event.target.value) })}
            />
            <small>Valid range: 2–15 seconds. Shorter intervals create harder battles.</small>
          </label>
          <label className="toggleLabel">
            <span><strong>Sound effects</strong><small>Respects browser autoplay restrictions.</small></span>
            <input type="checkbox" checked={draft.soundEnabled} onChange={(event) => setDraft({ ...draft, soundEnabled: event.target.checked })} />
          </label>
          <button className="primaryButton" type="submit">Save options</button>
        </form>
      </section>
    </main>
  );
}

