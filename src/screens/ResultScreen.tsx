import type { MatchResult } from '../game/core/types';

interface ResultScreenProps {
  readonly result: MatchResult;
  readonly onPlayAgain: () => void;
  readonly onMenu: () => void;
}

export function ResultScreen({ result, onPlayAgain, onMenu }: ResultScreenProps) {
  return (
    <main className="panelScreen resultScreen">
      <section className="resultPanel">
        <span className="eyebrow">Voyage complete</span>
        <h1>{result.endReason === 'TIME_EXPIRED' ? 'The final bell rang' : 'Your ship was lost'}</h1>
        <div className="resultScore"><span>Final bounty</span><strong>{result.score}</strong></div>
        <dl>
          <div><dt>Active duration</dt><dd>{result.activeDurationSeconds.toFixed(1)}s</dd></div>
          <div><dt>End reason</dt><dd>{result.endReason === 'TIME_EXPIRED' ? 'Time expired' : 'Player destroyed'}</dd></div>
          <div><dt>Match record</dt><dd className="pendingStatus">Local · API phase pending</dd></div>
        </dl>
        <div className="resultActions">
          <button className="primaryButton" type="button" onClick={onPlayAgain}>Play again</button>
          <button className="secondaryButton" type="button" onClick={onMenu}>Main menu</button>
        </div>
      </section>
    </main>
  );
}

