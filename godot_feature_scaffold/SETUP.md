# Wildlife Restoration Game — Feature Scaffold (Godot 4.x, 2D)

This scaffold implements the four features as reusable scripts. Copy the `scripts/`
folder into your existing project (e.g. `res://scripts/`) and follow the wiring
steps below. Nothing here overwrites your project — you attach these scripts to
your own nodes/scenes.

## 1. Autoload (required first)

`scripts/autoload/GameManager.gd` is the shared brain — restored animals, story
flags, puzzle completion.

- Project Settings → Autoload → add `scripts/autoload/GameManager.gd`, name it
  **GameManager**. It's referenced by name (`GameManager.restore_animal(...)`)
  from other scripts, so the autoload name must match exactly.

## 2. Open World Exploration — `Player.gd`

Attach to a `CharacterBody2D` scene:

```
Player (CharacterBody2D)  -> Player.gd
 ├─ Sprite2D / AnimatedSprite2D
 ├─ CollisionShape2D
 └─ InteractionArea (Area2D)
      └─ CollisionShape2D  (small circle, ~32px radius)
```

- Add the Player node to the **"player"** group (used by StoryTrigger).
- In Project Settings → Input Map, add actions: `move_left`, `move_right`,
  `move_up`, `move_down`, `interact` (e.g. bind to E or gamepad A).
- Your existing tilemap/level just needs collision layers set up normally —
  the script only handles movement + interaction, so it drops into any
  existing world scene.

## 3. Story-Driven Adventure — `DialogueBox.gd` + `StoryTrigger.gd`

- Build a small UI scene: `CanvasLayer > Panel > Label`, attach `DialogueBox.gd`
  to the CanvasLayer, and add this scene once to your main/HUD scene.
- Drop `StoryTrigger.gd` onto `Area2D` zones placed in your level (e.g. at the
  entrance to ruins) to fire narration when the player walks in. Use
  `required_flag` to gate later-game triggers behind earlier progress.

## 4. Environmental Puzzle System — `PuzzlePiece.gd` + `EnvironmentalPuzzle.gd`

```
EnvironmentalPuzzle (Node2D)  -> EnvironmentalPuzzle.gd
 ├─ PuzzlePiece (Area2D)  -> PuzzlePiece.gd   (e.g. a mirror)
 ├─ PuzzlePiece (Area2D)  -> PuzzlePiece.gd   (e.g. a totem)
 └─ PuzzlePiece (Area2D)  -> PuzzlePiece.gd   (e.g. a gear)
```

- Each `PuzzlePiece` has a `target_state` (the correct position/tone/rotation)
  and cycles through states when interacted with.
- Set `EnvironmentalPuzzle.unlock_target_path` to point at a door/gate node in
  your scene; give that node an `open()` method (or it'll fall back to hiding
  a `CollisionShape2D`/making the node invisible).
- `piece_type` (LIGHT / SOUND / MECHANISM) is there for you to branch visuals
  in `_update_visual()` — e.g. rotate a light beam sprite, play a tone,
  animate a gear.

## 5. Wildlife Restoration — `AnimalVoice.gd` (extends `Interactable.gd`)

```
AnimalVoice (Area2D)  -> AnimalVoice.gd
 ├─ Sprite2D
 ├─ CollisionShape2D
 └─ PromptLabel (Label, optional — "Press E")
```

- Set `animal_id` uniquely per creature, `lore_text` for the narrative line
  shown when restored.
- On interact, it calls `GameManager.restore_animal()`, shows the lore text
  via the DialogueBox, plays optional SFX/VFX, then fades out.
- `GameManager` auto-fires `chapter_unlocked` signals at 25% / 50% / 100%
  restoration — connect to these wherever you want to progress the story
  (e.g. open a new area, spawn a cutscene trigger). Tune thresholds in
  `GameManager._check_chapter_unlocks()`.

## How it all connects

```
Player walks the open world
   → touches a StoryTrigger  → DialogueBox shows narrative
   → touches an AnimalVoice   → GameManager.restore_animal() → DialogueBox
                                  → may unlock a chapter (signal)
   → touches PuzzlePieces     → EnvironmentalPuzzle checks solution
                                  → unlocks a gate/area, sets a story flag
```

Everything communicates through `GameManager` signals, so none of these
systems need direct references to each other — you can add/remove pieces
without breaking the rest.

## Suggested next steps
- Wire up a HUD showing restored-animal count (`GameManager.restored_animals.size()`).
- Replace `_update_visual()` in `PuzzlePiece.gd` with your actual sprite/light logic.
- If you'd like, share your actual `.zip`'d project (or its scene tree) and I
  can adapt these scripts to your existing node names and folder structure.
