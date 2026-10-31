import { useEffect, useRef } from 'react';
import type { MatchRecord } from '../api/contracts';
import { useSubmitMatch } from '../hooks/useRecords';

interface ResultScreenProps {
  readonly result: MatchRecord;
  readonly onPlayAgain: () => void;
  readonly onMenu: () => void;
}

export function ResultScreen({ result, onPlayAgain, onMenu }: ResultScreenProps) {
  const submission = useSubmitMatch();
  const submittedRef = useRef(false);

  useEffect(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    submission.mutate(result);
  }, [result, submission]);

  return (
    <main className="panelScreen resultScreen">
      <section className="resultPanel">
        <span className="eyebrow">Voyage complete</span>
        <h1>{result.endReason === 'TIME_EXPIRED' ? 'The final bell rang' : 'Your ship was lost'}</h1>
        <div className="resultScore"><span>Final bounty</span><strong>{result.score}</strong></div>
        <dl>
          <div><dt>Active duration</dt><dd>{result.activeDurationSeconds.toFixed(1)}s</dd></div>
          <div><dt>End reason</dt><dd>{result.endReason === 'TIME_EXPIRED' ? 'Time expired' : 'Player destroyed'}</dd></div>
          <div><dt>Match record</dt><dd className={submission.isSuccess ? 'successStatus' : 'pendingStatus'}>{submission.isPending ? 'Submitting…' : submission.isSuccess ? 'Confirmed' : submission.isError ? 'Pending retry' : 'Queued locally'}</dd></div>
        </dl>
        <div className="resultActions">
          {submission.isError && <button className="textButton" type="button" onClick={() => submission.mutate(result)}>Retry submission</button>}
          <button className="primaryButton" type="button" onClick={onPlayAgain}>Play again</button>
          <button className="secondaryButton" type="button" onClick={onMenu}>Main menu</button>
        </div>
      </section>
    </main>
  );
}

