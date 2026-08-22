import { useEffect } from 'react';
import { useGameStore } from '@/bridge/gameStore';
import { item } from '@/model/data/items';
import { PLAYER } from '@/model/tuning';

/**
 * Each piece subscribes to exactly the values it draws. A health change
 * re-renders the bar and nothing else - which is the whole reason the store
 * keeps these as flat primitives instead of one `hud` object.
 */
export function Hud() {
  return (
    <div className="hud">
      <div className="hud__left">
        <HealthBar />
        <BloodVials />
        <Loadout />
      </div>
      <div className="hud__right">
        <GoldCounter />
        <LevelName />
      </div>
      <InteractPrompt />
      <InjectRing />
      <Toasts />
    </div>
  );
}

function HealthBar() {
  const hp = useGameStore((s) => s.hp);
  const maxHp = useGameStore((s) => s.maxHp);
  const ratio = maxHp > 0 ? Math.max(0, hp / maxHp) : 0;
  const low = ratio <= 0.3;

  return (
    <div className={`healthbar ${low ? 'is-low' : ''}`}>
      <div className="healthbar__track">
        <div className="healthbar__fill" style={{ width: `${ratio * 100}%` }} />
      </div>
      <span className="healthbar__value">{hp}<em>/{maxHp}</em></span>
    </div>
  );
}

function BloodVials() {
  const vials = useGameStore((s) => s.vials);
  const incoming = useGameStore((s) => s.incomingBlood);

  return (
    <div className="vials" title="Dinosaur blood — hold S to inject for a full heal">
      {Array.from({ length: PLAYER.maxBloodVials }, (_, i) => {
        const filled = i < vials;
        const arriving = !filled && i < vials + incoming;
        return <span key={i} className={`vial ${filled ? 'is-full' : ''} ${arriving ? 'is-arriving' : ''}`} />;
      })}
    </div>
  );
}

function Loadout() {
  const weapon = useGameStore((s) => s.weapon);
  const passives = useGameStore((s) => s.passives);

  return (
    <div className="loadout">
      <span className="loadout__weapon">{weapon ? item(weapon).name : 'Bare hands'}</span>
      {passives.length > 0 && (
        <span className="loadout__passives">
          {passives.map((id) => item(id).name).join(' · ')}
        </span>
      )}
    </div>
  );
}

function GoldCounter() {
  const gold = useGameStore((s) => s.gold);
  if (gold <= 0) return null;
  return <div className="gold">{gold} <em>bars</em></div>;
}

function LevelName() {
  const name = useGameStore((s) => s.levelName);
  if (!name) return null;
  return <div className="levelname">{name}</div>;
}

function InteractPrompt() {
  const prompt = useGameStore((s) => s.interactPrompt);
  if (!prompt) return null;
  return (
    <div className="interact">
      <kbd>E</kbd> {prompt}
    </div>
  );
}

function InjectRing() {
  const progress = useGameStore((s) => s.injectProgress);
  if (progress <= 0) return null;
  return (
    <div className="inject">
      <svg viewBox="0 0 44 44" aria-hidden="true">
        <circle cx="22" cy="22" r="19" className="inject__track" />
        <circle
          cx="22" cy="22" r="19"
          className="inject__fill"
          style={{ strokeDashoffset: 119.4 * (1 - progress) }}
        />
      </svg>
      <span>Injecting</span>
    </div>
  );
}

function Toasts() {
  const toasts = useGameStore((s) => s.toasts);
  const dismiss = useGameStore((s) => s.dismissToast);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((t) => window.setTimeout(() => dismiss(t.id), 2600));
    return () => timers.forEach(window.clearTimeout);
  }, [toasts, dismiss]);

  return (
    <div className="toasts">
      {toasts.map((t) => (
        <span key={t.id} className={`toast toast--${t.kind}`}>{t.text}</span>
      ))}
    </div>
  );
}

/** Tutorial hint line, driven by progression flags. */
export function TutorialHint() {
  const hint = useGameStore((s) => s.tutorialHint);
  if (!hint) return null;
  return <div className="tutorial">{hint}</div>;
}
