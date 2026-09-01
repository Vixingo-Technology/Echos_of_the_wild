extends Node2D
class_name EnvironmentalPuzzle
## Environmental Puzzle System: groups PuzzlePiece children, checks solution,
## and unlocks a target node (door, gate, bridge) when all pieces are correct.
##
## Node structure:
## EnvironmentalPuzzle (Node2D, this script)
##  ├─ PuzzlePiece (Area2D) x N   -- the interactive elements
##  └─ (set unlock_target_path to a door/gate elsewhere in the scene)

signal solved

@export var puzzle_id: String = "ruins_puzzle_01"
@export var unlock_target_path: NodePath   # e.g. a StaticBody2D door with a "open" method
@export var story_flag_on_solve: String = ""  # optional flag to set in GameManager

var _pieces: Array[PuzzlePiece] = []
var _solved: bool = false

func _ready() -> void:
	for child in get_children():
		if child is PuzzlePiece:
			_pieces.append(child)
	if GameManager.is_puzzle_solved(puzzle_id):
		_apply_solved_state(true)

func notify_piece_changed(_piece: PuzzlePiece) -> void:
	if _solved:
		return
	_check_solution()

func _check_solution() -> void:
	for piece in _pieces:
		if not piece.is_correct():
			return
	_apply_solved_state(false)

func _apply_solved_state(instant: bool) -> void:
	_solved = true
	GameManager.mark_puzzle_solved(puzzle_id)
	if story_flag_on_solve != "":
		GameManager.set_story_flag(story_flag_on_solve)

	var target := get_node_or_null(unlock_target_path)
	if target:
		if target.has_method("open"):
			target.open()
		elif target is CollisionObject2D:
			target.set_deferred("disabled", true) if target is CollisionShape2D else null
			target.visible = false

	if not instant:
		emit_signal("solved")
