export type Action =
  | 'left' | 'right' | 'up' | 'down'
  | 'jump' | 'sprint' | 'punch' | 'kick'
  | 'inject' | 'bag' | 'interact' | 'pause' | 'confirm';

/** Uses KeyboardEvent.code, so bindings survive non-QWERTY layouts. */
export type Bindings = Record<Action, string[]>;

export const DEFAULT_BINDINGS: Bindings = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown'],
  jump: ['Space'],
  sprint: ['ShiftLeft', 'ShiftRight'],
  punch: ['KeyZ'],
  kick: ['KeyX'],
  inject: ['KeyS'],
  bag: ['KeyB'],
  interact: ['KeyE'],
  pause: ['Escape'],
  confirm: ['Enter', 'Space'],
};

export const ACTION_LABELS: Record<Action, string> = {
  left: 'Move left',
  right: 'Move right',
  up: 'Climb / enter',
  down: 'Crouch / drop through',
  jump: 'Jump',
  sprint: 'Sprint',
  punch: 'Punch',
  kick: 'Kick',
  inject: 'Inject blood',
  bag: 'Bag',
  interact: 'Interact',
  pause: 'Pause',
  confirm: 'Confirm',
};

/** Human-readable key name for tutorial prompts and the settings screen. */
export function keyLabel(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Arrow')) return { Up: '↑', Down: '↓', Left: '←', Right: '→' }[code.slice(5)] ?? code;
  if (code === 'Space') return 'Space';
  if (code.startsWith('Shift')) return 'Shift';
  return code;
}
