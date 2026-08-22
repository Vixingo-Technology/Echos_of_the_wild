import type { Action, Bindings } from './KeyBindings';
import { DEFAULT_BINDINGS } from './KeyBindings';

/**
 * Raw keyboard state.
 *
 * `pressed` and `released` are edge sets valid for exactly one simulation tick;
 * the loop clears them after stepping. That is what lets the model see a jump
 * press as an event rather than having to detect the edge itself.
 */
export class InputManager {
  bindings: Bindings = DEFAULT_BINDINGS;

  private readonly held = new Set<string>();
  private readonly pressed = new Set<string>();
  private readonly released = new Set<string>();
  private attached = false;

  /** Set while a text field has focus, so typing never drives the game. */
  private suspended = false;

  attach(target: Window = window): () => void {
    if (this.attached) return () => undefined;
    this.attached = true;

    const onKeyDown = (e: KeyboardEvent) => {
      if (this.shouldIgnore(e)) return;
      // Stop the browser scrolling on arrows and space while playing.
      if (this.isBound(e.code)) e.preventDefault();
      if (e.repeat) return;
      this.held.add(e.code);
      this.pressed.add(e.code);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (this.isBound(e.code)) e.preventDefault();
      this.held.delete(e.code);
      this.released.add(e.code);
    };
    // Losing focus mid-hold would otherwise leave Taro running forever.
    const onBlur = () => this.clear();

    target.addEventListener('keydown', onKeyDown);
    target.addEventListener('keyup', onKeyUp);
    target.addEventListener('blur', onBlur);

    return () => {
      target.removeEventListener('keydown', onKeyDown);
      target.removeEventListener('keyup', onKeyUp);
      target.removeEventListener('blur', onBlur);
      this.attached = false;
      this.clear();
    };
  }

  private shouldIgnore(e: KeyboardEvent): boolean {
    if (this.suspended) return true;
    const target = e.target as HTMLElement | null;
    if (!target) return false;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
  }

  private isBound(code: string): boolean {
    for (const codes of Object.values(this.bindings)) {
      if (codes.includes(code)) return true;
    }
    return false;
  }

  isHeld(action: Action): boolean {
    return this.bindings[action].some((code) => this.held.has(code));
  }

  wasPressed(action: Action): boolean {
    return this.bindings[action].some((code) => this.pressed.has(code));
  }

  wasReleased(action: Action): boolean {
    return this.bindings[action].some((code) => this.released.has(code));
  }

  /** Called by the loop once per tick, after the model has read the edges. */
  endFrame(): void {
    this.pressed.clear();
    this.released.clear();
  }

  clear(): void {
    this.held.clear();
    this.pressed.clear();
    this.released.clear();
  }

  setSuspended(suspended: boolean): void {
    this.suspended = suspended;
    if (suspended) this.clear();
  }
}
