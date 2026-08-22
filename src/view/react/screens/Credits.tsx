export function Credits({ onClose }: { onClose: () => void }) {
  return (
    <div className="panel-shell" role="dialog" aria-label="Credits">
      <div className="panel panel--narrow">
        <header className="panel__head">
          <h2>Credits</h2>
          <button type="button" className="panel__close" onClick={onClose}>Esc</button>
        </header>

        <div className="credits">
          <section>
            <h3>DinoPunk</h3>
            <p className="muted">A 2D action-platformer about getting home the long way.</p>
          </section>
          <section>
            <h3>Design &amp; direction</h3>
            <p>Vixingo</p>
          </section>
          <section>
            <h3>Engineering &amp; animation</h3>
            <p>Built with Claude Code. Every character animation is hand-authored
               skeletal keyframe data rather than drawn frames.</p>
          </section>
          <section>
            <h3>Built with</h3>
            <p className="muted">React · PixiJS · TypeScript · Vite · Tiled</p>
          </section>
        </div>
      </div>
    </div>
  );
}
