import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { compileClip, type ClipDef, type EaseName, type KeyframeDef } from '@/anim';
import { TARO_CHAINS, TARO_CLIPS, TARO_CLIP_DEFS, TARO_RIG } from '@/data/taro';
import { RigPreview } from '@/view/pixi/RigPreview';

const EASE_NAMES: EaseName[] = [
  'linear', 'quadIn', 'quadOut', 'quadInOut',
  'cubicIn', 'cubicOut', 'cubicInOut',
  'sineIn', 'sineOut', 'sineInOut',
  'expoOut', 'backOut', 'hold',
];

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const trackId = (bone: string, prop: string) => `${bone}.${prop}`;

/**
 * Dev-only animation workbench.
 *
 * The point of this screen is that animation timing stops being something only
 * the person editing JSON can change: scrub a clip, retune a keyframe, watch it
 * immediately, then copy the JSON back into src/data/clips/.
 */
export function RigEditor() {
  const stageRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<RigPreview | null>(null);
  const scrubRef = useRef<HTMLInputElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);

  const [defs, setDefs] = useState<ClipDef[]>(() => TARO_CLIP_DEFS.map(clone));
  const [clipId, setClipId] = useState(TARO_CLIP_DEFS[0]?.id ?? '');
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [carryX, setCarryX] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [debug, setDebug] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState('');
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const def = useMemo(() => defs.find((d) => d.id === clipId), [defs, clipId]);

  // ------------------------------------------------------------ pixi stage
  useEffect(() => {
    const parent = stageRef.current;
    if (!parent) return;

    const preview = new RigPreview({ rig: TARO_RIG, clips: TARO_CLIPS, chains: TARO_CHAINS });
    previewRef.current = preview;
    preview.onEvent = (event) => {
      setLog((prev) => [`${event.clipId}  ${event.time.toFixed(3)}s  ${event.name}`, ...prev].slice(0, 40));
    };
    void preview.init(parent).then(() => {
      if (previewRef.current === preview) preview.play(TARO_CLIP_DEFS[0]?.id ?? '', 0);
    });

    return () => {
      previewRef.current = null;
      preview.destroy();
    };
  }, []);

  useEffect(() => { previewRef.current?.setPaused(!playing); }, [playing]);
  useEffect(() => { previewRef.current?.setSpeed(speed); }, [speed]);
  useEffect(() => { previewRef.current?.setCarryX(carryX); }, [carryX]);
  useEffect(() => { previewRef.current?.setZoom(zoom); }, [zoom]);
  useEffect(() => { previewRef.current?.setDebugBones(debug); }, [debug]);

  const selectClip = useCallback((id: string) => {
    setClipId(id);
    setSelectedTrack('');
    setPlaying(true);
    previewRef.current?.play(id, 0.1);
  }, []);

  // Drive the scrubber straight through the DOM: this loop runs at 60Hz, and
  // re-rendering React that often for a single number is exactly what the
  // architecture forbids everywhere else.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const preview = previewRef.current;
      const duration = def?.duration ?? 1;
      if (preview && scrubRef.current && document.activeElement !== scrubRef.current) {
        const t = Math.min(preview.animator.time, duration);
        scrubRef.current.value = String(t);
        if (timeRef.current) timeRef.current.textContent = `${t.toFixed(3)} / ${duration.toFixed(2)}s`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [def?.duration]);

  // ------------------------------------------------------------ editing
  const applyDef = useCallback((next: ClipDef) => {
    try {
      const compiled = compileClip(next, TARO_RIG);
      previewRef.current?.animator.addClip(compiled);
      setDefs((prev) => prev.map((d) => (d.id === next.id ? next : d)));
      setError(null);
      const preview = previewRef.current;
      if (preview && !playing) preview.scrubTo(compiled, preview.animator.time);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [playing]);

  const editKey = useCallback(
    (track: string, index: number, patch: Partial<KeyframeDef>) => {
      if (!def) return;
      const next = clone(def);
      const target = next.tracks.find((t) => trackId(t.bone, t.prop) === track);
      const key = target?.keys[index];
      if (!key) return;
      Object.assign(key, patch);
      applyDef(next);
    },
    [def, applyDef],
  );

  const onScrub = useCallback((value: number) => {
    const preview = previewRef.current;
    if (!preview || !def) return;
    setPlaying(false);
    preview.setPaused(true);
    try {
      preview.scrubTo(compileClip(def, TARO_RIG), value);
    } catch {
      /* the error is already surfaced by applyDef */
    }
  }, [def]);

  const copyJson = useCallback(() => {
    if (!def) return;
    void navigator.clipboard.writeText(JSON.stringify(def, null, 2) + '\n');
  }, [def]);

  const track = def?.tracks.find((t) => trackId(t.bone, t.prop) === selectedTrack);

  return (
    <div className="rig">
      <div className="rig__stage" ref={stageRef}>
        <div className="rig__hint">
          Taro &middot; {TARO_RIG.bones.length} bones &middot; placeholder shapes
        </div>
      </div>

      <aside className="rig__panel">
        <h2>Rig Editor</h2>

        <section className="rig__section">
          <span className="rig__label">Clip</span>
          <div className="rig__clips">
            {defs.map((d) => (
              <button
                key={d.id}
                type="button"
                className="chip"
                aria-pressed={d.id === clipId}
                onClick={() => selectClip(d.id)}
              >
                {d.id.replace('taro.', '')}
              </button>
            ))}
          </div>
        </section>

        <section className="rig__section">
          <div className="rig__transport">
            <button type="button" onClick={() => setPlaying((p) => !p)}>
              {playing ? '⏸ Pause' : '▶ Play'}
            </button>
            <button type="button" onClick={() => { previewRef.current?.play(clipId, 0); setPlaying(true); }}>
              &#x21ba; Restart
            </button>
            <span className="rig__label" ref={timeRef} style={{ marginLeft: 'auto' }} />
          </div>
          <input
            ref={scrubRef}
            type="range"
            min={0}
            max={def?.duration ?? 1}
            step={0.001}
            defaultValue={0}
            onChange={(e) => onScrub(Number(e.target.value))}
            aria-label="Clip time"
          />
          <span className="rig__label">
            Speed <span>{speed.toFixed(2)}x</span>
          </span>
          <input type="range" min={0.05} max={2} step={0.05} value={speed}
                 onChange={(e) => setSpeed(Number(e.target.value))} />
        </section>

        <section className="rig__section">
          <span className="rig__label">
            Carry velocity <span>{carryX} u/s</span>
          </span>
          <input type="range" min={-900} max={900} step={25} value={carryX}
                 onChange={(e) => setCarryX(Number(e.target.value))} />
          <span className="rig__label">
            Zoom <span>{zoom.toFixed(2)}x</span>
          </span>
          <input type="range" min={0.4} max={2.5} step={0.05} value={zoom}
                 onChange={(e) => setZoom(Number(e.target.value))} />
          <label className="rig__label" style={{ justifyContent: 'flex-start', gap: '0.5rem' }}>
            <input type="checkbox" checked={debug} onChange={(e) => setDebug(e.target.checked)} />
            Show bones
          </label>
        </section>

        <section className="rig__section">
          <span className="rig__label">
            Track
            <button type="button" className="chip" onClick={copyJson}>Copy JSON</button>
          </span>
          <select value={selectedTrack} onChange={(e) => setSelectedTrack(e.target.value)}
                  style={{ width: '100%', padding: '0.3rem', background: '#131824', color: '#dfe6f2',
                           border: '1px solid #3d4a68', borderRadius: 3 }}>
            <option value="">Select a track&hellip;</option>
            {def?.tracks.map((t) => (
              <option key={trackId(t.bone, t.prop)} value={trackId(t.bone, t.prop)}>
                {t.bone}.{t.prop} ({t.keys.length} keys)
              </option>
            ))}
          </select>

          {track && (
            <table className="rig__keys">
              <thead>
                <tr><th>t</th><th>value</th><th>ease</th></tr>
              </thead>
              <tbody>
                {track.keys.map((key, i) => (
                  <tr key={i}>
                    <td style={{ width: '26%' }}>
                      <input type="number" step={0.005} value={key.t}
                             onChange={(e) => editKey(selectedTrack, i, { t: Number(e.target.value) })} />
                    </td>
                    <td style={{ width: '30%' }}>
                      <input type="number" step={1} value={key.v}
                             onChange={(e) => editKey(selectedTrack, i, { v: Number(e.target.value) })} />
                    </td>
                    <td>
                      <select value={key.ease ?? 'cubicInOut'}
                              onChange={(e) => editKey(selectedTrack, i, { ease: e.target.value as EaseName })}>
                        {EASE_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {error && <span style={{ color: '#ff7b9c', fontSize: '0.72rem' }}>{error}</span>}
        </section>

        <section className="rig__section">
          <span className="rig__label">
            Animation events
            <button type="button" className="chip" onClick={() => setLog([])}>Clear</button>
          </span>
          <div className="rig__events">
            {log.length === 0
              ? <em>No events yet. Try the walk or land clip.</em>
              : log.map((line, i) => <span key={i}>{line}</span>)}
          </div>
        </section>
      </aside>
    </div>
  );
}
