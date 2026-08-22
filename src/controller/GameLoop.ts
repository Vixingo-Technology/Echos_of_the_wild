import { Game } from '@/model/Game';
import { FIXED_DT } from '@/model/tuning';
import { loadLevel, LEVEL_IDS } from '@/data/levels';
import { serialize, deserialize } from '@/model/save/Serializer';
import { SaveRepository, AUTOSAVE_SLOT } from '@/services/SaveRepository';
import { ModelSyncAdapter } from '@/bridge/ModelSyncAdapter';
import { useGameStore } from '@/bridge/gameStore';
import { GameRenderer } from '@/view/pixi/GameRenderer';
import { InputManager } from './InputManager';
import { toIntent } from './IntentMapper';
import { NO_INTENT } from '@/model/domain/PlayerState';

/** Never simulate more than this per frame; an alt-tab must not fast-forward. */
const MAX_FRAME_DT = 0.25;

/**
 * Drives one frame: read input, step the simulation at a fixed 60Hz, render
 * with interpolation, then push a projection to React.
 *
 * The fixed step is what makes the physics reproducible - the same inputs
 * always produce the same run, regardless of the display's refresh rate.
 */
export class GameLoop {
  readonly game = new Game();
  readonly input = new InputManager();
  readonly renderer = new GameRenderer();
  readonly adapter = new ModelSyncAdapter();

  private accumulator = 0;
  private lastTime = 0;
  private raf = 0;
  private running = false;
  private detachInput: (() => void) | null = null;

  async attach(parent: HTMLElement): Promise<void> {
    await this.renderer.init(parent);
    this.detachInput = this.input.attach();
    this.adapter.listeners.push((event) => this.renderer.handleEvent(event));
    this.adapter.listeners.push((event) => {
      if (event.type === 'LevelExitReached') this.onLevelExit(event.toLevel, event.spawn);
    });

    const settings = useGameStore.getState().settings;
    this.renderer.setShowDamageNumbers(settings.showDamageNumbers);
    this.renderer.setScreenShake(settings.screenShake);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.raf = requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  destroy(): void {
    this.stop();
    this.detachInput?.();
    this.detachInput = null;
    this.renderer.destroy();
  }

  // ------------------------------------------------------------- lifecycle

  newGame(): void {
    this.game.newGame();
    this.game.loadLevel(loadLevel('cave_01'));
    this.renderer.reset();
    this.adapter.reset();
    this.input.clear();
    useGameStore.getState().setScreen('playing');
  }

  async loadFromSlot(slot: string): Promise<boolean> {
    const data = await SaveRepository.read(slot);
    if (!data) return false;

    deserialize(this.game, data, (id) => this.game.loadLevel(loadLevel(id)));
    this.renderer.reset();
    this.adapter.reset();
    this.input.clear();
    useGameStore.getState().setScreen('playing');
    return true;
  }

  async saveToSlot(slot: string): Promise<void> {
    await SaveRepository.write(slot, serialize(this.game, slot));
    await this.refreshSaves();
  }

  async refreshSaves(): Promise<void> {
    const saves = await SaveRepository.list((id) => {
      try {
        return loadLevel(id).displayName;
      } catch {
        return id;
      }
    });
    useGameStore.getState().setSaves(saves);
  }

  exitToMenu(): void {
    this.renderer.reset();
    this.adapter.reset();
    this.input.clear();
    useGameStore.getState().setScreen('menu');
  }

  private onLevelExit(toLevel: string, spawn: string): void {
    // Phase 1 ends at the cave mouth. Rather than pretending the next biome
    // exists, say so plainly.
    if (!LEVEL_IDS.includes(toLevel)) {
      useGameStore.getState().setScreen('victory');
      return;
    }
    this.game.loadLevel(loadLevel(toLevel), spawn);
    this.renderer.reset();
    void this.saveToSlot(AUTOSAVE_SLOT);
  }

  // ------------------------------------------------------------------ frame

  private get simulating(): boolean {
    const state = useGameStore.getState();
    return state.screen === 'playing' && state.overlays.length === 0;
  }

  private frame = (now: number): void => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.frame);

    const dt = Math.min((now - this.lastTime) / 1000, MAX_FRAME_DT);
    this.lastTime = now;

    this.handleUiKeys();

    if (this.simulating) {
      this.accumulator += dt;
      let stepped = false;
      // Cap the catch-up so a slow frame cannot spiral into a slower one.
      let budget = 5;
      while (this.accumulator >= FIXED_DT && budget-- > 0) {
        this.renderer.snapshot(this.game);
        // Edge-triggered inputs belong to exactly one step; later catch-up
        // steps in the same frame see held state only.
        this.game.step(FIXED_DT, stepped ? heldOnly(toIntent(this.input)) : toIntent(this.input));
        this.accumulator -= FIXED_DT;
        stepped = true;
      }
      if (this.accumulator >= FIXED_DT) this.accumulator = 0;
      this.input.endFrame();

      if (this.game.isGameOver) {
        useGameStore.getState().setScreen('gameover');
      }
    } else {
      this.input.endFrame();
      this.game.world.events.drain();
    }

    this.renderer.trackPlayer(this.game.world.player);
    this.renderer.draw(this.game, dt, this.accumulator / FIXED_DT);
    this.adapter.sync(this.game);
  };

  /** Esc and B work regardless of what the simulation is doing. */
  private handleUiKeys(): void {
    const store = useGameStore.getState();

    if (this.input.wasPressed('pause')) {
      if (store.overlays.length > 0) store.popOverlay();
      else if (store.screen === 'playing') store.pushOverlay('pause');
    }

    if (this.input.wasPressed('bag') && store.screen === 'playing') {
      if (store.overlays.includes('bag')) store.popOverlay();
      else if (store.overlays.length === 0) store.pushOverlay('bag');
    }
  }
}

function heldOnly(intent: ReturnType<typeof toIntent>) {
  return {
    ...NO_INTENT,
    moveX: intent.moveX,
    crouch: intent.crouch,
    sprint: intent.sprint,
    jumpHeld: intent.jumpHeld,
    injectHeld: intent.injectHeld,
  };
}
