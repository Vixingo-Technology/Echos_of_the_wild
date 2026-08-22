import { describe, expect, it } from 'vitest';
import { compileClip, compileRig } from './compile';
import { sampleTrack, samplePose, solveWorld } from './sampler';
import { SkeletalAnimator, type AnimEvent } from './SkeletalAnimator';
import { createPoseBuffer, ROT, STRIDE, X, Y } from './pose';
import type { ClipEventDef, RigDef } from './types';
import { TARO_CHAINS, TARO_CLIPS, TARO_RIG } from '@/data/taro';
import { ProceduralMotion } from './ProceduralMotion';

const twoBoneRig: RigDef = {
  id: 'test',
  height: 100,
  bones: [
    // Declared child-first on purpose: the compiler must reorder them.
    { id: 'child', parent: 'root', x: 50, y: 0, rotation: 0, length: 50, z: 1 },
    { id: 'root', parent: null, x: 0, y: 0, rotation: 0, length: 50, z: 0 },
  ],
};

describe('compileRig', () => {
  it('sorts parents before children regardless of declaration order', () => {
    const rig = compileRig(twoBoneRig);
    expect(rig.bones.map((b) => b.id)).toEqual(['root', 'child']);
    expect(rig.bones[1].parentIndex).toBe(0);
  });

  it('rejects an unknown parent', () => {
    expect(() =>
      compileRig({ id: 'bad', height: 1, bones: [{ id: 'a', parent: 'ghost', x: 0, y: 0, rotation: 0, length: 1, z: 0 }] }),
    ).toThrow(/unknown parent/);
  });

  it('rejects a bone cycle', () => {
    expect(() =>
      compileRig({
        id: 'bad', height: 1,
        bones: [
          { id: 'a', parent: 'b', x: 0, y: 0, rotation: 0, length: 1, z: 0 },
          { id: 'b', parent: 'a', x: 0, y: 0, rotation: 0, length: 1, z: 0 },
        ],
      }),
    ).toThrow(/cycle/);
  });

  it('converts authored degrees to radians', () => {
    const rig = compileRig({
      id: 'r', height: 1,
      bones: [{ id: 'a', parent: null, x: 0, y: 0, rotation: 90, length: 1, z: 0 }],
    });
    expect(rig.restPose[ROT]).toBeCloseTo(Math.PI / 2, 6);
  });
});

describe('sampleTrack', () => {
  const rig = compileRig(twoBoneRig);
  const clip = compileClip(
    {
      id: 'c', rig: 'test', duration: 1, loop: false,
      tracks: [{ bone: 'root', prop: 'x', keys: [{ t: 0, v: 0, ease: 'linear' }, { t: 1, v: 100 }] }],
    },
    rig,
  );

  it('interpolates linearly between keys', () => {
    expect(sampleTrack(clip.tracks[0], 0.25)).toBeCloseTo(25);
    expect(sampleTrack(clip.tracks[0], 0.5)).toBeCloseTo(50);
  });

  it('clamps outside the key range', () => {
    expect(sampleTrack(clip.tracks[0], -5)).toBe(0);
    expect(sampleTrack(clip.tracks[0], 99)).toBe(100);
  });

  it('applies the easing of the segment that starts at the key', () => {
    const eased = compileClip(
      {
        id: 'e', rig: 'test', duration: 1, loop: false,
        tracks: [{ bone: 'root', prop: 'x', keys: [{ t: 0, v: 0, ease: 'quadIn' }, { t: 1, v: 100 }] }],
      },
      rig,
    );
    expect(sampleTrack(eased.tracks[0], 0.5)).toBeCloseTo(25);
  });
});

describe('solveWorld', () => {
  it('composes rotation and translation down the chain', () => {
    const rig = compileRig(twoBoneRig);
    const local = createPoseBuffer(2);
    local.set(rig.restPose);
    // Rotate the root 90 degrees; the child sits 50 along the root's +X axis,
    // which after rotation points down the +Y axis.
    local[ROT] = Math.PI / 2;

    const world = createPoseBuffer(2);
    solveWorld(rig, local, world);

    expect(world[STRIDE + X]).toBeCloseTo(0, 5);
    expect(world[STRIDE + Y]).toBeCloseTo(50, 5);
    expect(world[STRIDE + ROT]).toBeCloseTo(Math.PI / 2, 5);
  });

  it('places Taro in his rest pose with both feet on the ground line', () => {
    const local = createPoseBuffer(TARO_RIG.bones.length);
    local.set(TARO_RIG.restPose);
    const world = createPoseBuffer(TARO_RIG.bones.length);
    solveWorld(TARO_RIG, local, world);

    for (const foot of ['footFront', 'footBack']) {
      const i = TARO_RIG.indexOf.get(foot)!;
      expect(world[i * STRIDE + Y]).toBeCloseTo(-4, 1);
    }
    const head = TARO_RIG.indexOf.get('head')!;
    expect(world[head * STRIDE + Y]).toBeLessThan(-140);
  });
});

describe('SkeletalAnimator', () => {
  const makeClip = (id: string, duration: number, loop: boolean, events: ClipEventDef[]) =>
    compileClip({ id, rig: 'test', duration, loop, events, tracks: [{ bone: 'root', prop: 'rot', keys: [{ t: 0, v: 0 }, { t: duration, v: 90 }] }] }, compileRig(twoBoneRig));

  const rig = compileRig(twoBoneRig);

  it('fires each event once, at the authored time', () => {
    const clip = makeClip('atk', 0.4, false, [
      { t: 0.12, name: 'hitboxOn' },
      { t: 0.2, name: 'hitboxOff' },
    ]);
    const anim = new SkeletalAnimator(rig, [clip]);
    anim.play('atk');

    const seen: AnimEvent[] = [];
    // 60Hz, the same cadence the fixed-timestep loop runs at.
    for (let i = 0; i < 30; i++) anim.update(1 / 60, seen);

    expect(seen.map((e) => e.name)).toEqual(['hitboxOn', 'hitboxOff']);
  });

  it('fires an event authored at t=0', () => {
    const clip = makeClip('jump', 0.3, false, [{ t: 0, name: 'sfx:jump' }]);
    const anim = new SkeletalAnimator(rig, [clip]);
    anim.play('jump');
    const seen = anim.update(1 / 60);
    expect(seen.map((e) => e.name)).toEqual(['sfx:jump']);
  });

  it('re-fires looped events once per cycle', () => {
    const clip = makeClip('walk', 0.5, true, [{ t: 0.0, name: 'footstep' }, { t: 0.25, name: 'footstep' }]);
    const anim = new SkeletalAnimator(rig, [clip]);
    anim.play('walk');

    const seen: AnimEvent[] = [];
    for (let i = 0; i < 60; i++) anim.update(1 / 60, seen); // exactly 2 cycles
    expect(seen.length).toBe(4);
  });

  it('does not replay a whole loop of events after a long stall', () => {
    const clip = makeClip('walk', 0.5, true, [{ t: 0.0, name: 'footstep' }, { t: 0.25, name: 'footstep' }]);
    const anim = new SkeletalAnimator(rig, [clip]);
    anim.play('walk');
    // 10s of a 0.5s clip is 20 cycles. Replaying them would fire 40 footsteps
    // in one frame; we want at most the current cycle's worth.
    const seen = anim.update(10);
    expect(seen.length).toBeLessThanOrEqual(3);
  });

  it('reports completion only for non-looping clips', () => {
    const anim = new SkeletalAnimator(rig, [makeClip('land', 0.2, false, [])]);
    anim.play('land');
    for (let i = 0; i < 20; i++) anim.update(1 / 60);
    expect(anim.isFinished).toBe(true);
  });

  it('blends between clips over the crossfade, then drops the outgoing clip', () => {
    const a = compileClip({ id: 'a', rig: 'test', duration: 1, loop: true, tracks: [{ bone: 'root', prop: 'rot', keys: [{ t: 0, v: 0 }] }] }, rig);
    const b = compileClip({ id: 'b', rig: 'test', duration: 1, loop: true, tracks: [{ bone: 'root', prop: 'rot', keys: [{ t: 0, v: 90 }] }] }, rig);
    const anim = new SkeletalAnimator(rig, [a, b]);

    anim.play('a');
    anim.update(1 / 60);
    expect(anim.pose[ROT]).toBeCloseTo(0, 5);

    anim.play('b', { crossfade: 0.2 });
    anim.update(0.1);
    expect(anim.isBlending).toBe(true);
    expect(anim.pose[ROT]).toBeGreaterThan(0.4);
    expect(anim.pose[ROT]).toBeLessThan(Math.PI / 2 - 0.1);

    anim.update(0.15);
    expect(anim.isBlending).toBe(false);
    expect(anim.pose[ROT]).toBeCloseTo(Math.PI / 2, 5);
  });

  it('rejects a clip built for a different rig', () => {
    const anim = new SkeletalAnimator(TARO_RIG);
    expect(() => anim.addClip(makeClip('x', 1, true, []))).toThrow(/targets rig/);
  });
});

describe("Taro's authored clips", () => {
  it('all compile and are registered against his rig', () => {
    expect(TARO_CLIPS.map((c) => c.id).sort()).toEqual([
      'taro.crouch', 'taro.death', 'taro.hurt', 'taro.idle', 'taro.inject',
      'taro.jumpFall', 'taro.jumpRise', 'taro.kick', 'taro.land',
      'taro.punch1', 'taro.punch2', 'taro.punch3', 'taro.run', 'taro.walk',
    ]);
    for (const c of TARO_CLIPS) expect(c.rig).toBe('taro');
  });

  it('drive every bone through a full walk cycle without producing NaN', () => {
    const anim = new SkeletalAnimator(TARO_RIG, TARO_CLIPS);
    anim.play('taro.walk');
    const world = createPoseBuffer(TARO_RIG.bones.length);
    for (let i = 0; i < 120; i++) {
      anim.update(1 / 60);
      solveWorld(TARO_RIG, anim.pose, world);
    }
    expect([...world].every(Number.isFinite)).toBe(true);
  });

  it('emit two footsteps per walk cycle', () => {
    const anim = new SkeletalAnimator(TARO_RIG, TARO_CLIPS);
    anim.play('taro.walk');
    const seen: AnimEvent[] = [];
    // 53 frames is 0.883s: just inside the 0.9s cycle. Landing exactly on the
    // boundary would also fire the next cycle's t=0 footstep, which is correct
    // behaviour but makes for a confusing count.
    for (let i = 0; i < 53; i++) anim.update(1 / 60, seen);
    expect(seen.filter((e) => e.name === 'footstep').length).toBe(2);
  });

  it('holds a steady footstep rate over many cycles', () => {
    const anim = new SkeletalAnimator(TARO_RIG, TARO_CLIPS);
    anim.play('taro.walk');
    const seen: AnimEvent[] = [];
    for (let i = 0; i < 600; i++) anim.update(1 / 60, seen); // 10s = 11.1 cycles
    const steps = seen.filter((e) => e.name === 'footstep').length;
    expect(steps).toBeGreaterThanOrEqual(22);
    expect(steps).toBeLessThanOrEqual(23);
  });

  it('keeps the head above the pelvis across every clip', () => {
    const head = TARO_RIG.indexOf.get('head')!;
    const pelvis = TARO_RIG.indexOf.get('pelvis')!;
    const local = createPoseBuffer(TARO_RIG.bones.length);
    const world = createPoseBuffer(TARO_RIG.bones.length);

    for (const clip of TARO_CLIPS) {
      for (let s = 0; s <= 10; s++) {
        samplePose(clip, (clip.duration * s) / 10, TARO_RIG, local);
        solveWorld(TARO_RIG, local, world);
        expect(world[head * STRIDE + Y]).toBeLessThan(world[pelvis * STRIDE + Y]);
      }
    }
  });
});

describe('ProceduralMotion', () => {
  it('settles the coat and hair without diverging', () => {
    const anim = new SkeletalAnimator(TARO_RIG, TARO_CLIPS);
    anim.play('taro.idle');
    const motion = new ProceduralMotion(TARO_RIG, TARO_CHAINS);
    const world = createPoseBuffer(TARO_RIG.bones.length);

    for (let i = 0; i < 300; i++) {
      anim.update(1 / 60);
      motion.apply(1 / 60, anim.pose, world, 0, 0);
    }

    expect([...world].every(Number.isFinite)).toBe(true);
    // The coat tip should hang somewhere below the torso, not fly off.
    const coatB = TARO_RIG.indexOf.get('coatB')!;
    expect(world[coatB * STRIDE + Y]).toBeGreaterThan(-120);
    expect(world[coatB * STRIDE + Y]).toBeLessThan(0);
  });

  it('trails the coat behind horizontal movement', () => {
    const settle = (carryX: number) => {
      const anim = new SkeletalAnimator(TARO_RIG, TARO_CLIPS);
      anim.play('taro.idle');
      const motion = new ProceduralMotion(TARO_RIG, TARO_CHAINS);
      const world = createPoseBuffer(TARO_RIG.bones.length);
      for (let i = 0; i < 180; i++) {
        anim.update(1 / 60);
        motion.apply(1 / 60, anim.pose, world, carryX, 0);
      }
      return world[TARO_RIG.indexOf.get('coatB')! * STRIDE + X];
    };
    // Running right should push the coat tip further left than standing still.
    expect(settle(600)).toBeLessThan(settle(0));
  });
});
