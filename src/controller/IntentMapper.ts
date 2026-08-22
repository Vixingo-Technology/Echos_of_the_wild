import { NO_INTENT, type PlayerIntent } from '@/model/domain/PlayerState';
import type { InputManager } from './InputManager';

/**
 * Translates keys into the model's intent vocabulary.
 *
 * This is the only place that knows a key code exists. Swap it for a gamepad
 * reader and nothing in the model changes.
 */
export function toIntent(input: InputManager): PlayerIntent {
  const left = input.isHeld('left');
  const right = input.isHeld('right');
  const down = input.isHeld('down');

  return {
    // Pressing both directions cancels out rather than picking one arbitrarily.
    moveX: (right ? 1 : 0) - (left ? 1 : 0),
    crouch: down,
    sprint: input.isHeld('sprint'),
    jumpPressed: input.wasPressed('jump'),
    jumpHeld: input.isHeld('jump'),
    punchPressed: input.wasPressed('punch'),
    kickPressed: input.wasPressed('kick'),
    injectHeld: input.isHeld('inject'),
    interactPressed: input.wasPressed('interact'),
    dropThrough: down && input.wasPressed('jump'),
  };
}

export { NO_INTENT };
export type { PlayerIntent };
