interface MenuScreenProps {
  readonly onPlay: () => void;
  readonly onOptions: () => void;
}

export function MenuScreen({ onPlay, onOptions }: MenuScreenProps) {
  return (
    <main className="menuScreen">
      <div className="menuMist" />
      <section className="menuHero">
        <span className="eyebrow">The seas remember every captain</span>
        <img className="gameLogo" src="/assets/fallback/logo.svg" alt="Pirate Havoc" />
        <p className="menuLead">Outsail the hunters. Break the gun line. Claim the bounty before the final bell.</p>
        <div className="menuActions">
          <button className="primaryButton playButton" type="button" onClick={onPlay}><span>Set sail</span><small>Start a new battle</small></button>
          <button className="secondaryButton" type="button" onClick={onOptions}>Options</button>
        </div>
      </section>

      <section className="menuDeck" aria-label="Game information">
        <article>
          <span className="cardNumber">01</span>
          <h2>Command</h2>
          <p><kbd>W</kbd> or <kbd>↑</kbd> to sail. <kbd>A</kbd>/<kbd>D</kbd> to turn.</p>
        </article>
        <article>
          <span className="cardNumber">02</span>
          <h2>Fire</h2>
          <p><kbd>Space</kbd> forward. <kbd>Q</kbd>/<kbd>E</kbd> broadsides.</p>
        </article>
        <article>
          <span className="cardNumber">03</span>
          <h2>Survive</h2>
          <p>Islands stop ships and cannon fire. Every direct takedown earns one bounty.</p>
        </article>
      </section>

      <nav className="menuTabs" aria-label="Records">
        <button type="button" disabled>World ranking <span>Coming in phase 5</span></button>
        <button type="button" disabled>Match history <span>Coming in phase 5</span></button>
      </nav>
      <footer>Jungle Gaming Game Developer Challenge · v0.1.0</footer>
    </main>
  );
}

