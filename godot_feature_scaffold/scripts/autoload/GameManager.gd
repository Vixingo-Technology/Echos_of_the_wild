extends Node
## Autoload singleton. Register this in Project Settings > Autoload as "GameManager".
## Central hub for story progress, restored wildlife, and puzzle completion.

signal animal_restored(animal_id: String, total_restored: int)
signal story_flag_set(flag_name: String, value: bool)
signal puzzle_solved(puzzle_id: String)
signal chapter_unlocked(chapter_id: String)

var restored_animals: Dictionary = {}   # animal_id -> true
var story_flags: Dictionary = {}        # flag_name -> bool
var solved_puzzles: Dictionary = {}     # puzzle_id -> true

@export var total_animals_in_game: int = 12

func restore_animal(animal_id: String) -> void:
	if restored_animals.has(animal_id):
		return
	restored_animals[animal_id] = true
	emit_signal("animal_restored", animal_id, restored_animals.size())
	_check_chapter_unlocks()

func get_restoration_progress() -> float:
	if total_animals_in_game <= 0:
		return 0.0
	return float(restored_animals.size()) / float(total_animals_in_game)

func set_story_flag(flag_name: String, value: bool = true) -> void:
	story_flags[flag_name] = value
	emit_signal("story_flag_set", flag_name, value)

func is_flag_set(flag_name: String) -> bool:
	return story_flags.get(flag_name, false)

func mark_puzzle_solved(puzzle_id: String) -> void:
	if solved_puzzles.has(puzzle_id):
		return
	solved_puzzles[puzzle_id] = true
	emit_signal("puzzle_solved", puzzle_id)

func is_puzzle_solved(puzzle_id: String) -> bool:
	return solved_puzzles.get(puzzle_id, false)

func _check_chapter_unlocks() -> void:
	# Example thresholds — tune to your story structure.
	var progress := get_restoration_progress()
	if progress >= 0.25 and not is_flag_set("chapter_1_unlocked"):
		set_story_flag("chapter_1_unlocked")
		emit_signal("chapter_unlocked", "chapter_1")
	elif progress >= 0.5 and not is_flag_set("chapter_2_unlocked"):
		set_story_flag("chapter_2_unlocked")
		emit_signal("chapter_unlocked", "chapter_2")
	elif progress >= 1.0 and not is_flag_set("chapter_final_unlocked"):
		set_story_flag("chapter_final_unlocked")
		emit_signal("chapter_unlocked", "chapter_final")
