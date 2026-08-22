import { useGameStore } from '@/bridge/gameStore';
import { ACTION_LABELS, DEFAULT_BINDINGS, keyLabel, type Action } from '@/controller/KeyBindings';

const SHOWN: Action[] = ['left', 'right', 'down', 'jump', 'sprint', 'punch', 'kick', 'inject', 'bag', 'interact', 'pause'];

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const settings = useGameStore((s) => s.settings);
  const update = useGameStore((s) => s.updateSettings);

  return (
    <div className="panel-shell" role="dialog" aria-label="Settings">
      <div className="panel panel--narrow">
        <header className="panel__head">
          <h2>Settings</h2>
          <button type="button" className="panel__close" onClick={onClose}>Esc</button>
        </header>

        <div className="settings">
          <label className="settings__row">
            <span>Master volume <em>{Math.round(settings.masterVolume * 100)}%</em></span>
            <input type="range" min={0} max={1} step={0.05} value={settings.masterVolume}
                   onChange={(e) => update({ masterVolume: Number(e.target.value) })} />
          </label>
          <label className="settings__row">
            <span>Music <em>{Math.round(settings.musicVolume * 100)}%</em></span>
            <input type="range" min={0} max={1} step={0.05} value={settings.musicVolume}
                   onChange={(e) => update({ musicVolume: Number(e.target.value) })} />
          </label>
          <label className="settings__row">
            <span>Sound effects <em>{Math.round(settings.sfxVolume * 100)}%</em></span>
            <input type="range" min={0} max={1} step={0.05} value={settings.sfxVolume}
                   onChange={(e) => update({ sfxVolume: Number(e.target.value) })} />
          </label>

          <label className="settings__check">
            <input type="checkbox" checked={settings.screenShake}
                   onChange={(e) => update({ screenShake: e.target.checked })} />
            Screen shake
          </label>
          <label className="settings__check">
            <input type="checkbox" checked={settings.showDamageNumbers}
                   onChange={(e) => update({ showDamageNumbers: e.target.checked })} />
            Damage numbers
          </label>
          <label className="settings__check">
            <input type="checkbox" checked={settings.reducedFlashing}
                   onChange={(e) => update({ reducedFlashing: e.target.checked })} />
            Reduce flashing
          </label>

          <h3>Controls</h3>
          <ul className="bindings">
            {SHOWN.map((action) => (
              <li key={action}>
                <span>{ACTION_LABELS[action]}</span>
                <span className="bindings__keys">
                  {DEFAULT_BINDINGS[action].map((code) => <kbd key={code}>{keyLabel(code)}</kbd>)}
                </span>
              </li>
            ))}
          </ul>
          <p className="muted">Rebinding arrives with the settings store in Phase 2.</p>
        </div>
      </div>
    </div>
  );
}
