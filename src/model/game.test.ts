import { beforeEach, describe, expect, it } from 'vitest';
import { Game } from './Game';
import { loadLevel } from '@/data/levels';
import { NO_INTENT, type PlayerIntent } from './domain/PlayerState';
import { COMBAT, FIXED_DT, PLAYER } from './tuning';
import { PUNCH_CHAIN, KICK } from './data/playerAnim';
import { Inventory } from './domain/Inventory';
import { Equipment } from './domain/Equipment';
import { Progression } from './domain/Progression';
import { craft, recipeStatuses } from './domain/Crafting';
import type { GameEvent } from './core/EventBus';
import { serialize, deserialize } from './save/Serializer';
import { migrate, SaveTooNewError } from './save/Migrations';
import { SAVE_VERSION } from './save/SaveSchema';

/** Deterministic RNG so loot rolls and blood amounts are reproducible. */
function seeded(seed = 1): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

const intent = (patch: Partial<PlayerIntent> = {}): PlayerIntent => ({ ...NO_INTENT, ...patch });

/** Advance the simulation, collecting everything it emitted. */
function run(game: Game, seconds: number, i: PlayerIntent = NO_INTENT): GameEvent[] {
  const events: GameEvent[] = [];
  const steps = Math.round(seconds / FIXED_DT);
  for (let n = 0; n < steps; n++) {
    game.step(FIXED_DT, i);
    events.push(...game.world.events.drain());
  }
  return events;
}

function newGame(): Game {
  const game = new Game(seeded(7));
  game.newGame();
  game.loadLevel(loadLevel('cave_01'));
  return game;
}

describe('level loading', () => {
  it('parses the cave into collision, spawns and entities', () => {
    const level = loadLevel('cave_01');
    expect(level.geometry.solids.length).toBeGreaterThan(5);
    expect(level.geometry.oneWay.length).toBeGreaterThan(0);
    expect(level.spawns.start).toBeDefined();
    expect(level.entities.some((e) => e.kind === 'enemy')).toBe(true);
    expect(level.entities.some((e) => e.kind === 'exit')).toBe(true);
  });

  it('places Taro at the spawn point with a full bar', () => {
    const game = newGame();
    const player = game.world.player!;
    expect(player.transform.x).toBeCloseTo(loadLevel('cave_01').spawns.start.x);
    expect(game.blood.current).toBe(PLAYER.maxHealth);
    expect(game.blood.vials).toBe(0);
  });
});

describe('physics and platforming', () => {
  it('settles Taro on the cave floor instead of falling through it', () => {
    const game = newGame();
    run(game, 1);
    const player = game.world.player!;
    expect(player.body!.onGround).toBe(true);
    expect(player.transform.y).toBeLessThan(game.world.geometry.height);
  });

  it('walks right when told to', () => {
    const game = newGame();
    run(game, 0.5);
    const startX = game.world.player!.transform.x;
    run(game, 1, intent({ moveX: 1 }));
    expect(game.world.player!.transform.x).toBeGreaterThan(startX + 100);
    expect(game.world.player!.transform.facing).toBe(1);
  });

  it('jumps roughly the height the tuning implies', () => {
    const game = newGame();
    run(game, 1);
    const groundY = game.world.player!.transform.y;

    let peak = groundY;
    const events: GameEvent[] = [];
    for (let n = 0; n < 60; n++) {
      game.step(FIXED_DT, intent({ jumpPressed: n === 0, jumpHeld: true }));
      events.push(...game.world.events.drain());
      peak = Math.min(peak, game.world.player!.transform.y);
    }

    const height = groundY - peak;
    // v^2 / 2g with the configured numbers is about 208 units.
    expect(height).toBeGreaterThan(170);
    expect(height).toBeLessThan(250);
  });

  it('jumps lower when the button is released early', () => {
    const measure = (holdFrames: number) => {
      const game = newGame();
      run(game, 1);
      const groundY = game.world.player!.transform.y;
      let peak = groundY;
      for (let n = 0; n < 60; n++) {
        game.step(FIXED_DT, intent({ jumpPressed: n === 0, jumpHeld: n < holdFrames }));
        game.world.events.drain();
        peak = Math.min(peak, game.world.player!.transform.y);
      }
      return groundY - peak;
    };
    expect(measure(3)).toBeLessThan(measure(60) * 0.75);
  });

  /** Did Taro actually leave the ground? The jump SFX is the unambiguous
   *  signal: reading velocity is confounded by collision zeroing it. */
  const jumped = (events: GameEvent[]) =>
    events.some((e) => e.type === 'Sfx' && e.name === 'jump');

  it('still jumps within the coyote window after leaving a ledge', () => {
    const game = newGame();
    run(game, 1);
    const player = game.world.player!;
    // Walked off an edge a moment ago: airborne, but only just.
    player.transform.y -= 30;
    player.body!.onGround = false;
    player.body!.timeOffGround = PLAYER.coyoteTime * 0.5;

    game.step(FIXED_DT, intent({ jumpPressed: true, jumpHeld: true }));
    expect(jumped(game.world.events.drain())).toBe(true);
  });

  it('ignores a jump once the coyote window has passed', () => {
    const game = newGame();
    run(game, 1);
    const player = game.world.player!;
    player.transform.y -= 30;
    player.body!.onGround = false;
    player.body!.timeOffGround = PLAYER.coyoteTime * 3;

    game.step(FIXED_DT, intent({ jumpPressed: true, jumpHeld: true }));
    expect(jumped(game.world.events.drain())).toBe(false);
  });

  it('buffers a jump pressed just before landing', () => {
    const game = newGame();
    run(game, 1);
    const player = game.world.player!;
    player.transform.y -= 40;
    player.body!.onGround = false;
    player.body!.timeOffGround = 1;
    player.velocity!.y = 200;

    // Press once while still airborne, then release. The buffer should carry
    // the press through to the moment he touches down.
    const events: GameEvent[] = [];
    game.step(FIXED_DT, intent({ jumpPressed: true }));
    events.push(...game.world.events.drain());
    for (let n = 0; n < 8; n++) {
      game.step(FIXED_DT, intent({}));
      events.push(...game.world.events.drain());
    }
    expect(jumped(events)).toBe(true);
  });
});

describe('combat', () => {
  it('opens the hitbox only during the clip window it is authored for', () => {
    const game = newGame();
    run(game, 1);
    const player = game.world.player!;

    const punch = PUNCH_CHAIN[0];
    const on = punch.events.find((e) => e.name === 'hitboxOn')!.t;
    const off = punch.events.find((e) => e.name === 'hitboxOff')!.t;

    game.step(FIXED_DT, intent({ punchPressed: true }));
    expect(game.runtime.action).toBe('attack');

    const seen: { t: number; active: boolean }[] = [];
    for (let n = 0; n < Math.round(punch.duration / FIXED_DT) + 2; n++) {
      seen.push({ t: game.runtime.actionTime, active: Boolean(player.hitbox) });
      game.step(FIXED_DT, intent({}));
      game.world.events.drain();
    }

    expect(seen.some((s) => s.t >= on && s.t < off && s.active)).toBe(true);
    expect(seen.filter((s) => s.t < on - FIXED_DT).every((s) => !s.active)).toBe(true);
    expect(seen.filter((s) => s.t > off + FIXED_DT).every((s) => !s.active)).toBe(true);
  });

  it('kills the mini dinosaur, drops a bone and yields blood', () => {
    const game = newGame();
    const dino = [...game.world.ofKind('enemy')][0];
    expect(dino).toBeDefined();

    // Put Taro next to it rather than platforming all the way there.
    const player = game.world.player!;
    player.transform.x = dino.transform.x - 60;
    player.transform.y = dino.transform.y;
    player.transform.facing = 1;

    const events: GameEvent[] = [];
    for (let n = 0; n < 600 && dino.health!.current > 0; n++) {
      game.step(FIXED_DT, intent({ punchPressed: n % 24 === 0 }));
      events.push(...game.world.events.drain());
    }

    expect(dino.health!.current).toBe(0);
    expect(events.some((e) => e.type === 'EnemyKilled')).toBe(true);

    const blood = events.find((e) => e.type === 'BloodGained');
    expect(blood).toBeDefined();
    if (blood?.type === 'BloodGained') {
      expect(blood.amount).toBeGreaterThanOrEqual(1);
      expect(blood.amount).toBeLessThanOrEqual(5);
    }

    run(game, 4, intent({}));
    expect(game.inventory.count('dino_bone')).toBeGreaterThan(0);
  });

  it('never lets one swing hit the same target twice', () => {
    const game = newGame();
    const dino = [...game.world.ofKind('enemy')][0];
    const player = game.world.player!;
    player.transform.x = dino.transform.x - 60;
    player.transform.y = dino.transform.y;
    player.transform.facing = 1;
    dino.health!.max = dino.health!.current = 9999;

    const events: GameEvent[] = [];
    game.step(FIXED_DT, intent({ punchPressed: true }));
    for (let n = 0; n < Math.round(PUNCH_CHAIN[0].duration / FIXED_DT) + 2; n++) {
      game.step(FIXED_DT, intent({}));
      events.push(...game.world.events.drain());
    }
    expect(events.filter((e) => e.type === 'DamageDealt').length).toBe(1);
  });

  it('escalates damage through the punch chain', () => {
    const game = newGame();
    expect(COMBAT.comboMultipliers[2]).toBeGreaterThan(COMBAT.comboMultipliers[0]);
    expect(PUNCH_CHAIN).toHaveLength(COMBAT.comboMultipliers.length);
    expect(KICK.duration).toBeGreaterThan(PUNCH_CHAIN[0].duration);
    void game;
  });

  it('applies hitstop to both parties on a connecting hit', () => {
    const game = newGame();
    const dino = [...game.world.ofKind('enemy')][0];
    const player = game.world.player!;
    player.transform.x = dino.transform.x - 60;
    player.transform.y = dino.transform.y;
    player.transform.facing = 1;

    for (let n = 0; n < 40; n++) {
      game.step(FIXED_DT, intent({ punchPressed: n === 0 }));
      game.world.events.drain();
      if (dino.health!.hitstop > 0) break;
    }
    expect(dino.health!.hitstop).toBeGreaterThan(0);
    expect(player.health!.hitstop).toBeGreaterThan(0);
  });
});

describe('blood and healing', () => {
  it('fills the meter gradually rather than all at once', () => {
    const game = newGame();
    game.blood.gainBlood(3);
    expect(game.blood.vials).toBe(0);
    expect(game.blood.incoming).toBe(3);

    run(game, 0.5);
    expect(game.blood.vials).toBe(1);
    run(game, 1.0);
    expect(game.blood.vials).toBe(3);
    expect(game.blood.incoming).toBe(0);
  });

  it('caps the meter', () => {
    const game = newGame();
    game.blood.gainBlood(999);
    run(game, 10);
    expect(game.blood.vials).toBe(PLAYER.maxBloodVials);
  });

  it('spends one vial for a full heal when S is held to completion', () => {
    const game = newGame();
    run(game, 1);
    game.blood.gainBlood(2);
    run(game, 1.2);
    game.blood.component.current = 20;

    const events = run(game, PLAYER.injectDuration + 0.3, intent({ injectHeld: true }));
    expect(game.blood.current).toBe(PLAYER.maxHealth);
    expect(game.blood.vials).toBe(1);
    expect(events.some((e) => e.type === 'BloodConsumed')).toBe(true);
  });

  it('costs nothing when S is released early', () => {
    const game = newGame();
    run(game, 1);
    game.blood.gainBlood(2);
    run(game, 1.2);
    game.blood.component.current = 20;

    run(game, 0.6, intent({ injectHeld: true }));
    run(game, 0.3, intent({ injectHeld: false }));

    expect(game.blood.vials).toBe(2);
    expect(game.blood.current).toBe(20);
  });

  it('refuses to inject with no vials', () => {
    const game = newGame();
    run(game, 1);
    game.blood.component.current = 20;
    run(game, 2, intent({ injectHeld: true }));
    expect(game.runtime.action).not.toBe('inject');
    expect(game.blood.current).toBe(20);
  });
});

describe('destructibles', () => {
  it('yields an apple on a hit and wood when felled', () => {
    const game = newGame();
    const tree = [...game.world.ofKind('destructible')]
      .find((e) => e.destructible?.hitDrop);
    expect(tree).toBeDefined();

    const player = game.world.player!;
    player.transform.x = tree!.transform.x - 50;
    player.transform.y = tree!.transform.y;
    player.transform.facing = 1;

    const events: GameEvent[] = [];
    for (let n = 0; n < 1200 && !tree!.dead; n++) {
      game.step(FIXED_DT, intent({ punchPressed: n % 24 === 0 }));
      events.push(...game.world.events.drain());
    }

    expect(events.some((e) => e.type === 'DestructibleBroken')).toBe(true);
    run(game, 4, intent({}));
    expect(game.inventory.count('apple')).toBeGreaterThan(0);
    expect(game.inventory.count('wood')).toBeGreaterThan(0);
  });

  it('remembers a felled tree so it does not come back on reload', () => {
    const game = newGame();
    const tree = [...game.world.ofKind('destructible')].find((e) => e.destructible?.hitDrop)!;
    const player = game.world.player!;
    player.transform.x = tree.transform.x - 50;
    player.transform.y = tree.transform.y;
    player.transform.facing = 1;

    for (let n = 0; n < 1200 && !tree.dead; n++) {
      game.step(FIXED_DT, intent({ punchPressed: n % 24 === 0 }));
      game.world.events.drain();
    }
    expect(game.progression.isConsumed('cave_01', 'destroyed', tree.sourceId!)).toBe(true);

    game.loadLevel(loadLevel('cave_01'));
    expect([...game.world.ofKind('destructible')].some((e) => e.sourceId === tree.sourceId)).toBe(false);
  });
});

describe('inventory, crafting and equipment', () => {
  it('stacks and splits correctly', () => {
    const inv = new Inventory(3);
    // Stack size is 20, so 25 apples occupy two of the three slots.
    expect(inv.add('apple', 25)).toBe(25);
    expect(inv.count('apple')).toBe(25);
    expect(inv.remove('apple', 30)).toBe(false);
    expect(inv.remove('apple', 25)).toBe(true);
    expect(inv.count('apple')).toBe(0);
  });

  it('reports have/need counts for the crafting tab', () => {
    const inv = new Inventory();
    const prog = new Progression();
    inv.add('dino_bone', 2);

    const club = recipeStatuses(inv, prog, null).find((s) => s.recipe.id === 'bone_club')!;
    expect(club.unlocked).toBe(true);
    expect(club.craftable).toBe(false);
    expect(club.blockedBy).toBe('missing-materials');
    expect(club.ingredients).toEqual([
      { item: 'dino_bone', have: 2, need: 3 },
      { item: 'wood', have: 0, need: 2 },
    ]);
  });

  it('consumes ingredients only on success', () => {
    const inv = new Inventory();
    const prog = new Progression();
    inv.add('dino_bone', 3);
    inv.add('wood', 1);

    expect(craft('bone_club', inv, prog, null)).toEqual({ ok: false, reason: 'missing-materials' });
    expect(inv.count('dino_bone')).toBe(3);

    inv.add('wood', 1);
    expect(craft('bone_club', inv, prog, null)).toEqual({ ok: true, item: 'bone_club', qty: 1 });
    expect(inv.count('dino_bone')).toBe(0);
    expect(inv.count('wood')).toBe(0);
    expect(inv.count('bone_club')).toBe(1);
  });

  it('smelts three nuggets into one gold bar, but only at a forge', () => {
    const inv = new Inventory();
    const prog = new Progression();
    prog.setFlag('found_forge');
    inv.add('gold_nugget', 3);

    expect(craft('gold_bar', inv, prog, null)).toEqual({ ok: false, reason: 'wrong-station' });
    expect(craft('gold_bar', inv, prog, 'forge')).toEqual({ ok: true, item: 'gold_bar', qty: 1 });
    expect(inv.count('gold_nugget')).toBe(0);
    expect(inv.count('gold_bar')).toBe(1);
  });

  it('hides recipes behind their unlock flag', () => {
    const inv = new Inventory();
    const prog = new Progression();
    const locked = recipeStatuses(inv, prog, 'forge').find((s) => s.recipe.id === 'gold_bar')!;
    expect(locked.unlocked).toBe(false);
    prog.setFlag('found_forge');
    const unlocked = recipeStatuses(inv, prog, 'forge').find((s) => s.recipe.id === 'gold_bar')!;
    expect(unlocked.unlocked).toBe(true);
  });

  it('holds one weapon and at most two passives', () => {
    const eq = new Equipment();
    expect(eq.equipWeapon('bone_club')).toBe(true);
    expect(eq.equipWeapon('apple')).toBe(false);
    expect(eq.equipWeapon('stone_axe')).toBe(true);
    expect(eq.weapon).toBe('stone_axe');

    expect(eq.equipPassive('iron_skin')).toBe(true);
    expect(eq.equipPassive('swift_boots')).toBe(true);
    expect(eq.equipPassive('orchard_lore')).toBe(false);
    expect(eq.equipPassive('orchard_lore', 0)).toBe(true);
    expect(eq.passives).toEqual(['orchard_lore', 'swift_boots']);
  });

  it('sums passive modifiers and caps resistance', () => {
    const eq = new Equipment();
    eq.equipPassive('iron_skin');
    eq.equipPassive('swift_boots');
    expect(eq.modifiers.damageResist).toBeCloseTo(0.25);
    expect(eq.modifiers.sprintBonus).toBeCloseTo(1.3);
    expect(eq.modifiers.damageResist).toBeLessThanOrEqual(0.8);
  });

  it('makes an equipped weapon hit harder than fists', () => {
    const bare = new Game(seeded(3));
    bare.newGame();
    bare.loadLevel(loadLevel('cave_01'));

    const armed = new Game(seeded(3));
    armed.newGame();
    armed.loadLevel(loadLevel('cave_01'));
    armed.inventory.add('iron_blade', 1);
    expect(armed.equipWeapon('iron_blade')).toBe(true);

    const damageFrom = (game: Game) => {
      const dino = [...game.world.ofKind('enemy')][0];
      const player = game.world.player!;
      player.transform.x = dino.transform.x - 60;
      player.transform.y = dino.transform.y;
      player.transform.facing = 1;
      dino.health!.max = dino.health!.current = 9999;

      const events: GameEvent[] = [];
      game.step(FIXED_DT, intent({ punchPressed: true }));
      for (let n = 0; n < 40; n++) {
        game.step(FIXED_DT, intent({}));
        events.push(...game.world.events.drain());
      }
      const hit = events.find((e) => e.type === 'DamageDealt' && e.targetId === dino.id);
      return hit?.type === 'DamageDealt' ? hit.amount : 0;
    };

    expect(damageFrom(armed)).toBeGreaterThan(damageFrom(bare));
  });

  it('eats an apple to heal, and refuses at full health', () => {
    const game = newGame();
    game.inventory.add('apple', 2);
    expect(game.useItem('apple')).toBe(false);

    game.blood.component.current = 10;
    expect(game.useItem('apple')).toBe(true);
    expect(game.blood.current).toBe(35);
    expect(game.inventory.count('apple')).toBe(1);
  });
});

describe('enemy behaviour', () => {
  let game: Game;
  beforeEach(() => { game = newGame(); });

  it('patrols between its authored bounds while Taro is far away', () => {
    const dino = [...game.world.ofKind('enemy')][0];
    const min = dino.ai!.patrolMinX;
    const max = dino.ai!.patrolMaxX;

    run(game, 8);
    expect(dino.ai!.mode).toBe('patrol');
    expect(dino.transform.x).toBeGreaterThanOrEqual(min - 80);
    expect(dino.transform.x).toBeLessThanOrEqual(max + 80);
  });

  it('notices Taro and closes the distance', () => {
    const dino = [...game.world.ofKind('enemy')][0];
    const player = game.world.player!;
    player.transform.x = dino.transform.x - 260;
    player.transform.y = dino.transform.y;

    run(game, 0.5);
    expect(dino.ai!.mode === 'chase' || dino.ai!.mode === 'attack').toBe(true);
  });

  it('bites Taro for damage he can survive', () => {
    const dino = [...game.world.ofKind('enemy')][0];
    const player = game.world.player!;
    player.transform.x = dino.transform.x - 70;
    player.transform.y = dino.transform.y;

    const events = run(game, 4);
    const hurt = events.find((e) => e.type === 'PlayerHurt');
    expect(hurt).toBeDefined();
    expect(game.blood.current).toBeLessThan(PLAYER.maxHealth);
    expect(game.blood.current).toBeGreaterThan(0);
  });

  it('gives Taro invulnerability frames so one dino cannot chain-bite him down', () => {
    const dino = [...game.world.ofKind('enemy')][0];
    const player = game.world.player!;
    player.transform.x = dino.transform.x - 70;
    player.transform.y = dino.transform.y;

    const events = run(game, 1.5);
    const hits = events.filter((e) => e.type === 'PlayerHurt').length;
    // Bite cooldown plus i-frames means at most a couple of hits in 1.5s.
    expect(hits).toBeLessThanOrEqual(2);
  });
});

describe('triggers', () => {
  it('reports reaching the cave mouth', () => {
    const game = newGame();
    const exit = game.world.entities.find((e) => e.trigger?.kind === 'exit')!;
    const player = game.world.player!;
    player.transform.x = exit.transform.x;
    player.transform.y = exit.transform.y;

    const events = run(game, 0.2);
    const reached = events.find((e) => e.type === 'LevelExitReached');
    expect(reached).toBeDefined();
    if (reached?.type === 'LevelExitReached') expect(reached.toLevel).toBe('jungle_01');
  });

  it('sets the tutorial flag once and only once', () => {
    const game = newGame();
    const trigger = game.world.entities.find((e) => e.trigger?.kind === 'flag')!;
    const player = game.world.player!;
    player.transform.x = trigger.transform.x;
    player.transform.y = trigger.transform.y;

    const events = run(game, 1);
    expect(events.filter((e) => e.type === 'TutorialFlag').length).toBe(1);
    expect(game.progression.hasFlag('saw_first_dino')).toBe(true);
  });
});

describe('death', () => {
  it('plays the death clip and then reports game over', () => {
    const game = newGame();
    run(game, 1);
    game.blood.component.current = 0;

    run(game, 0.1);
    expect(game.runtime.action).toBe('dead');
    expect(game.isGameOver).toBe(false);

    run(game, 1.2);
    expect(game.isGameOver).toBe(true);
  });

  it('kills Taro if he falls out of the level', () => {
    const game = newGame();
    const player = game.world.player!;
    player.transform.y = game.world.geometry.height + 900;
    run(game, 0.1);
    expect(game.blood.isDead).toBe(true);
  });
});

describe('save and load', () => {
  it('round-trips a game exactly', () => {
    const game = newGame();
    run(game, 1);
    run(game, 0.6, intent({ moveX: 1 }));

    game.inventory.add('dino_bone', 5);
    game.inventory.add('wood', 3);
    game.inventory.add('gold_bar', 2);
    game.craft('bone_club');
    game.equipWeapon('bone_club');
    game.inventory.add('iron_skin', 1);
    game.equipPassive('iron_skin');
    game.progression.setFlag('saw_first_dino');
    game.progression.markConsumed('cave_01', 'destroyed', '42');
    game.blood.gainBlood(3);
    run(game, 1.5);
    game.blood.component.current = 61;

    const saved = serialize(game, 'slot-1');
    const json = JSON.parse(JSON.stringify(saved));

    const restored = new Game(seeded(99));
    deserialize(restored, json, (id) => restored.loadLevel(loadLevel(id)));

    expect(restored.world.levelId).toBe('cave_01');
    expect(restored.world.player!.transform.x).toBeCloseTo(game.world.player!.transform.x, 5);
    expect(restored.world.player!.transform.y).toBeCloseTo(game.world.player!.transform.y, 5);
    expect(restored.blood.current).toBe(61);
    expect(restored.blood.vials).toBe(3);
    expect(restored.inventory.toJSON()).toEqual(game.inventory.toJSON());
    expect(restored.equipment.toJSON()).toEqual({ weapon: 'bone_club', passives: ['iron_skin'] });
    expect(restored.progression.hasFlag('saw_first_dino')).toBe(true);
    expect(restored.progression.isConsumed('cave_01', 'destroyed', '42')).toBe(true);
    expect(restored.playtimeMs).toBe(saved.playtimeMs);
  });

  it('does not resurrect scenery the save says was destroyed', () => {
    const game = newGame();
    const tree = [...game.world.ofKind('destructible')].find((e) => e.destructible?.hitDrop)!;
    game.progression.markConsumed('cave_01', 'destroyed', tree.sourceId!);

    const restored = new Game(seeded(1));
    deserialize(restored, JSON.parse(JSON.stringify(serialize(game, 'slot-1'))),
      (id) => restored.loadLevel(loadLevel(id)));

    expect([...restored.world.ofKind('destructible')].some((e) => e.sourceId === tree.sourceId)).toBe(false);
  });

  it('refuses a save written by a newer build rather than corrupting state', () => {
    const game = newGame();
    const data = { ...serialize(game, 'slot-1'), version: SAVE_VERSION + 5 };
    expect(() => migrate(data)).toThrow(SaveTooNewError);
  });
});

describe('level design invariants', () => {
  /**
   * The cave has to be climbable. Rather than trusting a hand-drawn staircase,
   * assert that every ledge is within one jump of the one before it - the check
   * that would have caught the first layout walling Taro in at the spawn.
   */
  it('keeps every ledge within a single jump of the last', () => {
    const level = loadLevel('cave_01');
    const ledges = level.geometry.solids
      .filter((s) => s.width <= 600 && s.y > 100 && s.y < level.height - 200)
      .sort((a, b) => a.x - b.x);

    expect(ledges.length).toBeGreaterThanOrEqual(6);

    // v^2/2g, then the horizontal distance covered over the full arc.
    const maxRise = (PLAYER.jumpVelocity ** 2) / (2 * 2400);
    const airtime = (2 * PLAYER.jumpVelocity) / 2400;
    const maxRun = PLAYER.sprintSpeed * airtime;

    for (let i = 1; i < ledges.length; i++) {
      const from = ledges[i - 1];
      const to = ledges[i];
      const rise = from.y - to.y;
      const gap = to.x - (from.x + from.width);

      expect(rise).toBeLessThan(maxRise * 0.85);
      expect(gap).toBeLessThan(maxRun * 0.8);
      expect(gap).toBeGreaterThanOrEqual(0);
    }
  });

  it('leaves the spawn clear enough for Taro to build up speed', () => {
    const level = loadLevel('cave_01');
    const spawn = level.spawns.start;
    const blocking = level.geometry.solids
      .filter((s) => s.x > spawn.x && s.y < spawn.y && s.y + s.height > spawn.y - PLAYER.height)
      .sort((a, b) => a.x - b.x)[0];

    expect(blocking).toBeDefined();
    expect(blocking.x - spawn.x).toBeGreaterThan(250);
  });
});
