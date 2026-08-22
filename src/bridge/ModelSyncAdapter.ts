import type { Game } from '@/model/Game';
import type { GameEvent } from '@/model/core/EventBus';
import { item } from '@/model/data/items';
import { PLAYER } from '@/model/tuning';
import { useGameStore } from './gameStore';

type Numbers = {
  hp: number; maxHp: number; vials: number; incomingBlood: number;
  injectProgress: number; gold: number;
};

/**
 * The one-way valve between the simulation and React.
 *
 * Per-frame values are diffed against a shadow copy and only written when they
 * actually change, so standing still costs zero React renders. Structural data
 * (bag contents, recipes, equipment) is only written when a domain event says
 * it moved. Entity positions never come through here at all - they go straight
 * to Pixi.
 */
export class ModelSyncAdapter {
  private shadow: Numbers = {
    hp: -1, maxHp: -1, vials: -1, incomingBlood: -1, injectProgress: -1, gold: -1,
  };
  private prompt: string | null | undefined = undefined;
  private levelName = '';
  private bagDirty = true;

  /** Extra sinks for events, e.g. audio and the renderer's FX layer. */
  readonly listeners: ((event: GameEvent) => void)[] = [];

  reset(): void {
    this.shadow = { hp: -1, maxHp: -1, vials: -1, incomingBlood: -1, injectProgress: -1, gold: -1 };
    this.prompt = undefined;
    this.levelName = '';
    this.bagDirty = true;
  }

  markBagDirty(): void {
    this.bagDirty = true;
  }

  /** Call once per rendered frame, after the simulation has stepped. */
  sync(game: Game): void {
    const store = useGameStore.getState();
    this.drainEvents(game);

    const runtime = game.runtime;
    const next: Numbers = {
      hp: Math.round(game.blood.current),
      maxHp: game.blood.max,
      vials: game.blood.vials,
      incomingBlood: game.blood.incoming,
      injectProgress: runtime.action === 'inject'
        ? Math.min(1, runtime.actionTime / PLAYER.injectDuration)
        : 0,
      gold: game.gold,
    };

    const patch: Partial<Numbers> = {};
    let changed = false;
    for (const key of Object.keys(next) as (keyof Numbers)[]) {
      if (next[key] !== this.shadow[key]) {
        patch[key] = next[key];
        this.shadow[key] = next[key];
        changed = true;
      }
    }
    if (changed) useGameStore.setState(patch);

    const target = runtime.interactTarget === null ? null : game.world.get(runtime.interactTarget);
    const prompt = target?.trigger?.prompt ?? null;
    if (prompt !== this.prompt) {
      this.prompt = prompt;
      useGameStore.setState({ interactPrompt: prompt });
    }

    const levelName = game.level?.displayName ?? '';
    if (levelName !== this.levelName) {
      this.levelName = levelName;
      useGameStore.setState({ levelName });
    }

    if (this.bagDirty) {
      this.bagDirty = false;
      useGameStore.setState({
        slots: game.inventory.toJSON(),
        recipes: game.recipes(),
        weapon: game.equipment.weapon,
        passives: [...game.equipment.passives],
        station: game.station,
      });
    } else if (game.station !== store.station) {
      // Walking up to a forge changes which recipes are craftable.
      useGameStore.setState({ station: game.station, recipes: game.recipes() });
    }
  }

  private drainEvents(game: Game): void {
    const events = game.world.events.drain();
    if (events.length === 0) return;

    const store = useGameStore.getState();

    for (const event of events) {
      for (const listener of this.listeners) listener(event);

      switch (event.type) {
        case 'ItemAdded':
          this.bagDirty = true;
          store.pushToast(`+${event.qty} ${item(event.item).name}`, 'item');
          break;
        case 'ItemRemoved':
        case 'ItemEquipped':
          this.bagDirty = true;
          break;
        case 'ItemCrafted':
          this.bagDirty = true;
          store.pushToast(`Crafted ${item(event.item).name}`, 'craft');
          break;
        case 'SecretFound':
          this.bagDirty = true;
          store.pushToast(`Hidden: ${item(event.item).name}!`, 'secret');
          break;
        case 'TutorialFlag':
          this.bagDirty = true;
          break;
        default:
          break;
      }
    }
  }
}
