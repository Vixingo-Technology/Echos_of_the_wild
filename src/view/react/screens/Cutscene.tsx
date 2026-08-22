import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import intro from '@/data/cutscenes/intro.json';

export interface CutscenePanel {
  art: string;
  caption: string;
  durationMs: number;
}

const CUTSCENES: Record<string, { id: string; panels: CutscenePanel[] }> = {
  intro,
};

interface Props {
  id?: string;
  onFinish: () => void;
}

/**
 * Data-driven panel player: the same component runs the intro, the mid-game
 * relic reveals and the ending, because all three are just a list of stills
 * with captions.
 *
 * The fade in / hold / fade out cycle is a CSS animation timed by a custom
 * property rather than React state, so a panel change is one render rather
 * than three.
 *
 * Panel art is currently a composed gradient standing in for the generated
 * illustration. Each `art` key is also the name of its Nano Banana prompt, so
 * dropping the real images in is a change of one CSS rule per panel.
 */
export function Cutscene({ id = 'intro', onFinish }: Props) {
  const panels = useMemo(() => CUTSCENES[id]?.panels ?? [], [id]);
  const [index, setIndex] = useState(0);
  const finished = useRef(false);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    onFinish();
  }, [onFinish]);

  const advance = useCallback(() => {
    setIndex((current) => {
      if (current + 1 >= panels.length) {
        finish();
        return current;
      }
      return current + 1;
    });
  }, [panels.length, finish]);

  useEffect(() => {
    const panel = panels[index];
    if (!panel) return;
    const timer = window.setTimeout(advance, panel.durationMs);
    return () => window.clearTimeout(timer);
  }, [index, panels, advance]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        finish();
      } else if (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowRight') {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advance, finish]);

  const panel = panels[index];
  if (!panel) return null;

  // `key` on the index restarts the animations on every cut.
  const timing = { '--panel-ms': `${panel.durationMs}ms` } as React.CSSProperties;

  return (
    <div className="cutscene">
      <div key={`art-${index}`} style={timing}
           className={`cutscene__panel cutscene__panel--${panel.art}`} aria-hidden="true" />
      <div className="cutscene__vignette" aria-hidden="true" />

      <p key={`cap-${index}`} style={timing} className="cutscene__caption">{panel.caption}</p>

      <div className="cutscene__progress" aria-label={`Panel ${index + 1} of ${panels.length}`}>
        {panels.map((_, i) => (
          <span key={i} className={i <= index ? 'is-done' : ''} />
        ))}
      </div>

      <button type="button" className="cutscene__skip" onClick={finish}>
        Skip <kbd>Esc</kbd>
      </button>
    </div>
  );
}
