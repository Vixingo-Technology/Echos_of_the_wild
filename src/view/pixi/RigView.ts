import { Container, Graphics, Sprite, type Texture } from 'pixi.js';
import type { CompiledBone, CompiledRig } from '@/anim';
import { ALPHA, ROT, STRIDE, SX, SY, X, Y, type PoseBuffer } from '@/anim';

/**
 * Binds a solved world pose to Pixi display objects.
 *
 * Bones are laid out FLAT and sorted by `z` rather than nested to match the
 * skeleton, because Pixi always draws a child after its parent - which would
 * force the draw order to follow the bone hierarchy. A cut-out character needs
 * them independent: the back arm is a child of the chest but must draw behind
 * the torso.
 */
export class RigView {
  readonly rig: CompiledRig;
  readonly container: Container;

  private readonly nodes: Container[] = [];
  private readonly debug: Graphics;
  private debugVisible = false;

  constructor(rig: CompiledRig, textures?: ReadonlyMap<string, Texture>) {
    this.rig = rig;
    this.container = new Container();
    this.container.sortableChildren = true;

    for (const bone of rig.bones) {
      const node = new Container();
      node.zIndex = bone.z;

      const art = this.buildArt(bone, textures);
      if (art) node.addChild(art);

      this.nodes.push(node);
      this.container.addChild(node);
    }

    this.debug = new Graphics();
    this.debug.zIndex = 10_000;
    this.debug.visible = false;
    this.container.addChild(this.debug);
  }

  private buildArt(bone: CompiledBone, textures?: ReadonlyMap<string, Texture>): Container | null {
    const texture = bone.sprite ? textures?.get(bone.sprite.texture) : undefined;

    if (bone.sprite && texture) {
      const sprite = new Sprite(texture);
      sprite.anchor.set(bone.sprite.anchorX, bone.sprite.anchorY);
      return sprite;
    }

    if (bone.placeholder) {
      const { w, h, color, anchorX, anchorY, radius = 0 } = bone.placeholder;
      const g = new Graphics();
      g.roundRect(-anchorX * w, -anchorY * h, w, h, radius)
        .fill({ color })
        .stroke({ color: 0x101014, width: 1.5, alignment: 1 });
      return g;
    }

    return null;
  }

  /** True once every bone that declares a sprite has a real texture bound. */
  get usesPlaceholders(): boolean {
    return this.rig.bones.some((b) => b.placeholder && !b.sprite);
  }

  setDebugBones(visible: boolean): void {
    this.debugVisible = visible;
    this.debug.visible = visible;
  }

  /** Push a world-space pose (as produced by `solveWorld`) onto the sprites. */
  update(world: PoseBuffer): void {
    for (let i = 0; i < this.nodes.length; i++) {
      const o = i * STRIDE;
      const node = this.nodes[i];
      node.position.set(world[o + X], world[o + Y]);
      node.rotation = world[o + ROT];
      node.scale.set(world[o + SX], world[o + SY]);
      node.alpha = world[o + ALPHA];
    }

    if (this.debugVisible) this.drawDebug(world);
  }

  private drawDebug(world: PoseBuffer): void {
    this.debug.clear();
    for (const bone of this.rig.bones) {
      const o = bone.index * STRIDE;
      const x = world[o + X];
      const y = world[o + Y];
      const rot = world[o + ROT];

      if (bone.length > 0) {
        this.debug
          .moveTo(x, y)
          .lineTo(x + Math.cos(rot) * bone.length, y + Math.sin(rot) * bone.length)
          .stroke({ color: 0x00ffc8, width: 1.5, alpha: 0.9 });
      }
      this.debug.circle(x, y, 2.5).fill({ color: 0xff2d6f });
    }
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
