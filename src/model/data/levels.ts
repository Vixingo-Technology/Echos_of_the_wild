import type { LevelGeometry } from '@/model/core/World';

/** The slice of the Tiled JSON format this game actually reads. */
interface TiledProperty { name: string; type: string; value: string | number | boolean }
interface TiledObject {
  id: number;
  name: string;
  type?: string;
  class?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  properties?: TiledProperty[];
}
interface TiledLayer { type: string; name: string; objects?: TiledObject[] }
export interface TiledMap {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: TiledLayer[];
  properties?: TiledProperty[];
}

export type LevelEntityKind = 'enemy' | 'destructible' | 'exit' | 'trigger' | 'forge' | 'npc';

export interface LevelEntity {
  /** Tiled's object id. Stable across level edits, which is what makes it safe
   *  to use as the key for "this tree is already chopped down". */
  sourceId: string;
  kind: LevelEntityKind;
  x: number;
  /** Ground contact line: the bottom edge of the Tiled rectangle. */
  y: number;
  width: number;
  height: number;
  props: Record<string, string | number | boolean>;
}

export interface LevelData {
  id: string;
  width: number;
  height: number;
  geometry: LevelGeometry;
  spawns: Record<string, { x: number; y: number }>;
  entities: LevelEntity[];
  /** Biome key, used to pick parallax layers and ambience. */
  biome: string;
  displayName: string;
}

function readProps(o: { properties?: TiledProperty[] }): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const p of o.properties ?? []) out[p.name] = p.value;
  return out;
}

function kindOf(o: TiledObject): string {
  return o.type ?? o.class ?? '';
}

/**
 * Parses a Tiled export into the model's level shape.
 *
 * Collision comes from an object layer of invisible rectangles rather than
 * from a tile grid, because the art is painted rather than tiled - it lets the
 * visuals and the physics be authored independently.
 */
export function parseLevel(id: string, map: TiledMap): LevelData {
  const geometry: LevelGeometry = {
    solids: [],
    oneWay: [],
    ladders: [],
    width: map.width * map.tilewidth,
    height: map.height * map.tileheight,
  };
  const spawns: Record<string, { x: number; y: number }> = {};
  const entities: LevelEntity[] = [];

  for (const layer of map.layers) {
    if (layer.type !== 'objectgroup' || !layer.objects) continue;

    for (const o of layer.objects) {
      const kind = kindOf(o);
      const rect = { x: o.x, y: o.y, width: o.width, height: o.height };

      switch (kind) {
        case 'solid': geometry.solids.push(rect); break;
        case 'oneway': geometry.oneWay.push(rect); break;
        case 'ladder': geometry.ladders.push(rect); break;

        case 'spawn':
          spawns[o.name || 'start'] = { x: o.x + o.width / 2, y: o.y + o.height };
          break;

        case 'enemy':
        case 'destructible':
        case 'exit':
        case 'trigger':
        case 'forge':
        case 'npc':
          entities.push({
            sourceId: String(o.id),
            kind,
            x: o.x + o.width / 2,
            y: o.y + o.height,
            width: o.width,
            height: o.height,
            props: readProps(o),
          });
          break;

        default:
          // Decorative object layers are the renderer's business, not the model's.
          break;
      }
    }
  }

  const mapProps = readProps(map);
  return {
    id,
    width: geometry.width,
    height: geometry.height,
    geometry,
    spawns,
    entities,
    biome: String(mapProps.biome ?? 'cave'),
    displayName: String(mapProps.displayName ?? id),
  };
}
