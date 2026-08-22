import { SAVE_VERSION, type SaveData } from './SaveSchema';

type Migration = (data: Record<string, unknown>) => Record<string, unknown>;

/**
 * Keyed by the version being migrated FROM. A save written by any earlier
 * build walks this chain up to the current version.
 *
 * There is nothing here yet because v1 is the first shipped schema. The chain
 * exists from the start so that adding v2 is a five-line change rather than a
 * decision about whether to support old saves at all.
 */
const MIGRATIONS: Record<number, Migration> = {};

export class SaveTooNewError extends Error {
  constructor(version: number) {
    super(`Save is version ${version}, but this build only understands ${SAVE_VERSION}.`);
    this.name = 'SaveTooNewError';
  }
}

export function migrate(raw: unknown): SaveData {
  if (typeof raw !== 'object' || raw === null) throw new Error('Save file is not an object');

  let data = raw as Record<string, unknown>;
  let version = typeof data.version === 'number' ? data.version : 0;

  if (version > SAVE_VERSION) throw new SaveTooNewError(version);

  while (version < SAVE_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) throw new Error(`No migration from save version ${version}`);
    data = step(data);
    version = typeof data.version === 'number' ? data.version : version + 1;
  }

  return data as unknown as SaveData;
}
