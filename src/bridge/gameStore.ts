import { create } from 'zustand';
import type { Slot } from '@/model/domain/Inventory';
import type { RecipeStatus } from '@/model/domain/Crafting';
import type { CraftStation } from '@/model/data/recipes';
import type { SaveSummary } from '@/model/save/SaveSchema';

export type Screen = 'menu' | 'cutscene' | 'playing' | 'gameover' | 'victory';
export type Overlay = 'pause' | 'bag' | 'shop' | 'saves' | 'settings' | 'credits';

export interface Toast {
  id: number;
  text: string;
  kind: 'item' | 'craft' | 'secret' | 'warn';
}

export interface Settings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  screenShake: boolean;
  showDamageNumbers: boolean;
  reducedFlashing: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  masterVolume: 0.8,
  musicVolume: 0.5,
  sfxVolume: 0.9,
  screenShake: true,
  showDamageNumbers: true,
  reducedFlashing: false,
};

interface GameStore {
  screen: Screen;
  overlays: Overlay[];

  // --- per-frame slice -----------------------------------------------------
  // Deliberately flat primitives: components select one number each, so a
  // health change re-renders the health bar and nothing else.
  hp: number;
  maxHp: number;
  vials: number;
  incomingBlood: number;
  injectProgress: number;
  gold: number;
  interactPrompt: string | null;
  levelName: string;

  // --- event-driven slice --------------------------------------------------
  slots: Slot[];
  recipes: RecipeStatus[];
  weapon: string | null;
  passives: string[];
  station: CraftStation;
  toasts: Toast[];
  tutorialHint: string | null;

  settings: Settings;
  saves: Record<string, SaveSummary | null>;

  setScreen: (screen: Screen) => void;
  pushOverlay: (overlay: Overlay) => void;
  popOverlay: () => Overlay | null;
  closeOverlays: () => void;
  isOverlayOpen: () => boolean;

  pushToast: (text: string, kind?: Toast['kind']) => void;
  dismissToast: (id: number) => void;
  setTutorialHint: (hint: string | null) => void;

  updateSettings: (patch: Partial<Settings>) => void;
  setSaves: (saves: Record<string, SaveSummary | null>) => void;
}

let nextToastId = 1;

export const useGameStore = create<GameStore>((set, get) => ({
  screen: 'menu',
  overlays: [],

  hp: 100,
  maxHp: 100,
  vials: 0,
  incomingBlood: 0,
  injectProgress: 0,
  gold: 0,
  interactPrompt: null,
  levelName: '',

  slots: [],
  recipes: [],
  weapon: null,
  passives: [],
  station: null,
  toasts: [],
  tutorialHint: null,

  settings: DEFAULT_SETTINGS,
  saves: {},

  setScreen: (screen) => set({ screen, overlays: [] }),

  pushOverlay: (overlay) =>
    set((state) =>
      state.overlays.includes(overlay) ? state : { overlays: [...state.overlays, overlay] },
    ),

  // Esc pops the topmost overlay rather than guessing which one was meant.
  // One stack removes a whole class of "Esc did the wrong thing" bugs.
  popOverlay: () => {
    const stack = get().overlays;
    if (stack.length === 0) return null;
    const top = stack[stack.length - 1];
    set({ overlays: stack.slice(0, -1) });
    return top;
  },

  closeOverlays: () => set({ overlays: [] }),
  isOverlayOpen: () => get().overlays.length > 0,

  pushToast: (text, kind = 'item') =>
    set((state) => ({ toasts: [...state.toasts.slice(-4), { id: nextToastId++, text, kind }] })),

  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  setTutorialHint: (tutorialHint) => set({ tutorialHint }),

  updateSettings: (patch) => set((state) => ({ settings: { ...state.settings, ...patch } })),
  setSaves: (saves) => set({ saves }),
}));

export const storeApi = useGameStore;
