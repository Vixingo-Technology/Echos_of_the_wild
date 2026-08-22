import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import type { Game } from '@/model/Game';
import type { GameEvent } from '@/model/core/EventBus';
import type { Entity, EntityId } from '@/model/core/types';
import { enemy } from '@/model/data/enemies';
import { CameraView } from './CameraView';
import { PropEntityView, RiggedEntityView, type EntityView } from './EntityView';

const BIOME: Record<string, { sky: [number, number]; near: number; mid: number; far: number; ground: number }> = {
  cave: { sky: [0x120f1a, 0x241d2e], near: 0x1c1725, mid: 0x2a2136, far: 0x372b45, ground: 0x3a3040 },
  jungle: { sky: [0x1b3348, 0x3c5a4a], near: 0x1d3326, mid: 0x2d4a33, far: 0x466b45, ground: 0x3d5238 },
};

const damageStyle = new TextStyle({
  fontFamily: 'Bungee, Arial Black, sans-serif',
  fontSize: 26,
  fontWeight: '900',
  fill: 0xfff2cc,
  stroke: { color: 0x14110f, width: 5, join: 'round' },
});

interface FloatingText {
  text: Text;
  life: number;
  vy: number;
}

interface Particle {
  g: Graphics;
  life: number;
  maxLife: number;
  vx: number;
  vy: number;
}

/**
 * Draws the world.
 *
 * Level visuals and level collision are separate on purpose: these blocks are
 * drawn from the same rectangles the physics uses, and they get replaced by
 * painted parallax and 9-slice platform skins without the collision moving.
 */
export class GameRenderer {
  readonly camera = new CameraView();

  private readonly app = new Application();
  private readonly parallax = new Container();
  private readonly world = new Container();
  private readonly terrain = new Graphics();
  private readonly entityLayer = new Container();
  private readonly fxLayer = new Container();
  private readonly skyGradient = new Graphics();

  private readonly views = new Map<EntityId, EntityView>();
  private readonly floaters: FloatingText[] = [];
  private readonly particles: Particle[] = [];
  private readonly parallaxBands: { g: Graphics; factor: number }[] = [];

  private levelId = '';
  private showDamageNumbers = true;
  private destroyed = false;
  private debugBones = false;

  async init(parent: HTMLElement): Promise<void> {
    await this.app.init({
      resizeTo: parent,
      background: 0x0d0f14,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
    });
    if (this.destroyed) {
      this.app.destroy(true);
      return;
    }

    parent.appendChild(this.app.canvas);
    this.app.stage.addChild(this.skyGradient, this.parallax, this.world);
    this.entityLayer.sortableChildren = true;
    this.world.addChild(this.terrain, this.entityLayer, this.fxLayer);
  }

  get canvas(): HTMLCanvasElement | null {
    return this.app.canvas ?? null;
  }

  get viewWidth(): number {
    return this.app.renderer ? this.app.screen.width : 0;
  }

  get viewHeight(): number {
    return this.app.renderer ? this.app.screen.height : 0;
  }

  setShowDamageNumbers(show: boolean): void {
    this.showDamageNumbers = show;
  }

  setScreenShake(enabled: boolean): void {
    this.camera.shakeEnabled = enabled;
  }

  toggleDebugBones(): boolean {
    this.debugBones = !this.debugBones;
    for (const view of this.views.values()) {
      if (view instanceof RiggedEntityView) view.setDebugBones(this.debugBones);
    }
    return this.debugBones;
  }

  // ------------------------------------------------------------------ level

  private buildLevel(game: Game): void {
    const geo = game.world.geometry;
    const palette = BIOME[game.level?.biome ?? 'cave'] ?? BIOME.cave;

    this.terrain.clear();
    for (const solid of geo.solids) {
      this.terrain
        .roundRect(solid.x, solid.y, solid.width, solid.height, 6)
        .fill({ color: palette.ground })
        .stroke({ color: 0x14110f, width: 4, alignment: 1 });
      // A lighter cap so the standable surface is unambiguous.
      this.terrain
        .rect(solid.x + 4, solid.y + 3, solid.width - 8, 6)
        .fill({ color: palette.far });
    }
    for (const platform of geo.oneWay) {
      this.terrain
        .roundRect(platform.x, platform.y, platform.width, 14, 5)
        .fill({ color: palette.mid })
        .stroke({ color: 0x14110f, width: 3, alignment: 1 });
    }

    this.buildParallax(geo.width, geo.height, palette);
    this.camera.bounds = { width: geo.width, height: geo.height };
    this.levelId = game.world.levelId;
  }

  private buildParallax(width: number, height: number, palette: (typeof BIOME)['cave']): void {
    this.parallax.removeChildren();
    this.parallaxBands.length = 0;

    // Three bands standing in for the generated layers. Their scroll factors
    // are already what the painted art will use, so swapping art in later is
    // a texture change and nothing else.
    const bands: { colour: number; factor: number; top: number; amplitude: number; step: number }[] = [
      { colour: palette.far, factor: 0.25, top: height * 0.18, amplitude: 90, step: 260 },
      { colour: palette.mid, factor: 0.5, top: height * 0.38, amplitude: 120, step: 190 },
      { colour: palette.near, factor: 0.78, top: height * 0.58, amplitude: 150, step: 130 },
    ];

    for (const band of bands) {
      const g = new Graphics();
      const span = width * 2;
      g.moveTo(-width * 0.5, height + 200);
      for (let x = -width * 0.5; x <= span; x += band.step) {
        const h = band.top + Math.sin(x * 0.0021 + band.factor * 9) * band.amplitude;
        g.lineTo(x, h);
        g.lineTo(x + band.step * 0.5, h + band.amplitude * 0.4);
      }
      g.lineTo(span, height + 200);
      g.closePath();
      g.fill({ color: band.colour });

      this.parallax.addChild(g);
      this.parallaxBands.push({ g, factor: band.factor });
    }
  }

  private drawSky(palette: (typeof BIOME)['cave']): void {
    const w = this.viewWidth;
    const h = this.viewHeight;
    this.skyGradient.clear();
    this.skyGradient.rect(0, 0, w, h).fill({ color: palette.sky[0] });
    this.skyGradient.rect(0, h * 0.35, w, h * 0.65).fill({ color: palette.sky[1], alpha: 0.85 });
  }

  // ------------------------------------------------------------------ frame

  /**
   * Record every entity's position before a simulation tick, so the next frame
   * can interpolate from where things actually were rather than from wherever
   * the last rendered frame happened to catch them.
   */
  snapshot(game: Game): void {
    if (this.views.size === 0) return;
    for (const entity of game.world.entities) {
      this.views.get(entity.id)?.snapshot(entity);
    }
  }

  /** @param alpha interpolation factor between the last two simulation ticks. */
  draw(game: Game, dt: number, alpha: number): void {
    if (!this.app.renderer) return;

    if (this.levelId !== game.world.levelId) {
      this.reset();
      this.buildLevel(game);
      const player = game.world.player;
      if (player) this.camera.snapTo(player.transform.x, player.transform.y - 80);
    }

    const palette = BIOME[game.level?.biome ?? 'cave'] ?? BIOME.cave;
    this.drawSky(palette);

    this.syncViews(game, dt, alpha);

    const player = game.world.player;
    if (player) {
      this.camera.follow(
        player.transform.x,
        player.transform.y - 70,
        player.transform.facing,
        this.viewWidth,
        this.viewHeight,
        dt,
      );
    }

    const camX = this.camera.offsetX - this.viewWidth / 2;
    const camY = this.camera.offsetY - this.viewHeight / 2;
    this.world.position.set(-camX, -camY);
    for (const band of this.parallaxBands) {
      band.g.position.set(-camX * band.factor, -camY * band.factor * 0.5);
    }

    this.updateFx(dt);
  }

  private syncViews(game: Game, dt: number, alpha: number): void {
    const seen = new Set<EntityId>();

    for (const entity of game.world.entities) {
      if (entity.dead) continue;
      seen.add(entity.id);

      let view = this.views.get(entity.id);
      if (!view) {
        const created = this.createView(entity);
        if (!created) continue;
        view = created;
        this.views.set(entity.id, view);
        this.entityLayer.addChild(view.container);
      }
      view.container.zIndex = entity.kind === 'player' ? 100 : entity.kind === 'enemy' ? 90 : 50;
      view.update(entity, dt, alpha);
    }

    for (const [id, view] of this.views) {
      if (seen.has(id)) continue;
      view.destroy();
      this.views.delete(id);
    }
  }

  private createView(entity: Entity): EntityView | null {
    if (entity.kind === 'player') {
      const view = new RiggedEntityView('taro', (x, y) => this.dust(x, y));
      view.setDebugBones(this.debugBones);
      return view;
    }
    if (entity.kind === 'enemy') {
      const view = new RiggedEntityView(enemy(entity.enemyType ?? 'mini_dino').rig, (x, y) => this.dust(x, y));
      view.setDebugBones(this.debugBones);
      return view;
    }
    // Triggers are invisible in play; the level author sees them in Tiled.
    if (entity.kind === 'trigger') return null;
    return new PropEntityView(entity);
  }

  // --------------------------------------------------------------------- fx

  handleEvent(event: GameEvent): void {
    switch (event.type) {
      case 'DamageDealt':
        if (this.showDamageNumbers) this.floatText(String(event.amount), event.x, event.y);
        this.burst(event.x, event.y, event.killed ? 18 : 8, event.killed ? 0xd23b3b : 0xfff2cc);
        break;
      case 'CameraShake':
        this.camera.addShake(event.strength);
        break;
      case 'DestructibleBroken':
        this.burst(event.x, event.y, 22, 0x8a7a5e);
        break;
      case 'SecretFound':
        this.burst(event.x, event.y, 26, 0x22d3ee);
        break;
      case 'PlayerHealed':
        if (this.showDamageNumbers && event.amount > 0) {
          const player = this.lastPlayerPos;
          this.floatText(`+${event.amount}`, player.x, player.y, 0x7fe3a0);
        }
        break;
      default:
        break;
    }
  }

  private lastPlayerPos = { x: 0, y: 0 };

  trackPlayer(entity: Entity | undefined): void {
    if (entity) this.lastPlayerPos = { x: entity.transform.x, y: entity.transform.y - 120 };
  }

  private floatText(value: string, x: number, y: number, colour = 0xfff2cc): void {
    const text = new Text({ text: value, style: damageStyle });
    text.tint = colour;
    text.anchor.set(0.5);
    text.position.set(x + (Math.random() - 0.5) * 26, y);
    this.fxLayer.addChild(text);
    this.floaters.push({ text, life: 0.85, vy: -120 });
  }

  private burst(x: number, y: number, count: number, colour: number): void {
    for (let i = 0; i < count; i++) {
      const g = new Graphics();
      const size = 2 + Math.random() * 4;
      g.rect(-size / 2, -size / 2, size, size).fill({ color: colour });
      g.position.set(x, y);
      this.fxLayer.addChild(g);
      const angle = Math.random() * Math.PI * 2;
      const speed = 90 + Math.random() * 260;
      this.particles.push({
        g,
        life: 0.5 + Math.random() * 0.35,
        maxLife: 0.85,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 90,
      });
    }
  }

  private dust(x: number, y: number): void {
    for (let i = 0; i < 3; i++) {
      const g = new Graphics();
      g.circle(0, 0, 2 + Math.random() * 3).fill({ color: 0xb8ab97, alpha: 0.55 });
      g.position.set(x + (Math.random() - 0.5) * 26, y - 4);
      this.fxLayer.addChild(g);
      this.particles.push({
        g,
        life: 0.35,
        maxLife: 0.35,
        vx: (Math.random() - 0.5) * 70,
        vy: -30 - Math.random() * 50,
      });
    }
  }

  private updateFx(dt: number): void {
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i];
      f.life -= dt;
      f.vy += 260 * dt;
      f.text.y += f.vy * dt;
      f.text.alpha = Math.max(0, f.life / 0.85);
      f.text.scale.set(1 + (1 - f.life / 0.85) * 0.25);
      if (f.life <= 0) {
        f.text.destroy();
        this.floaters.splice(i, 1);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.vy += 900 * dt;
      p.g.x += p.vx * dt;
      p.g.y += p.vy * dt;
      p.g.alpha = Math.max(0, p.life / p.maxLife);
      if (p.life <= 0) {
        p.g.destroy();
        this.particles.splice(i, 1);
      }
    }
  }

  // ---------------------------------------------------------------- teardown

  reset(): void {
    for (const view of this.views.values()) view.destroy();
    this.views.clear();
    for (const f of this.floaters) f.text.destroy();
    this.floaters.length = 0;
    for (const p of this.particles) p.g.destroy();
    this.particles.length = 0;
    this.levelId = '';
  }

  destroy(): void {
    this.destroyed = true;
    this.reset();
    if (this.app.renderer) this.app.destroy(true, { children: true });
  }
}
