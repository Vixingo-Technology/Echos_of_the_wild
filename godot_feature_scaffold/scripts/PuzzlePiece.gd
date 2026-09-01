extends Interactable
class_name PuzzlePiece
## Environmental Puzzle System: one interactive element within a puzzle
## (e.g. a mirror to redirect light, a totem to play a tone, a lever/gear).
## Assign this node as a child of an EnvironmentalPuzzle, or set puzzle_path manually.

enum PieceType { LIGHT, SOUND, MECHANISM }

@export var piece_type: PieceType = PieceType.MECHANISM
@export var target_state: int = 1        # e.g. rotation step, tone index, gear position
@export var toggle_states: int = 4       # how many states this piece cycles through
@export var puzzle_path: NodePath        # path to the EnvironmentalPuzzle controlling this piece

var current_state: int = 0
var _puzzle: Node = null

func _ready() -> void:
	super._ready()
	one_shot = false  # puzzle pieces can be toggled repeatedly
	if puzzle_path != NodePath(""):
		_puzzle = get_node_or_null(puzzle_path)
	else:
		_puzzle = get_parent() if get_parent() is EnvironmentalPuzzle else null

func _on_interact(_player: Node) -> void:
	current_state = (current_state + 1) % toggle_states
	_update_visual()
	if _puzzle and _puzzle.has_method("notify_piece_changed"):
		_puzzle.notify_piece_changed(self)

func is_correct() -> bool:
	return current_state == target_state

func _update_visual() -> void:
	# Hook for rotating a sprite, changing a light color, playing a tone, etc.
	# Override or connect externally based on piece_type.
	pass
