extends Area2D
class_name Interactable
## Base class for any object the player can interact with.
## Attach to an Area2D. Add this node to the "interactable" group
## (Node > Groups tab, or it's added automatically in _ready below).

@export var prompt_text: String = "Press E to interact"
@export var one_shot: bool = true  # if true, disables itself after first interact

var _used: bool = false

func _ready() -> void:
	add_to_group("interactable")

## Called by Player when player is in range and presses interact.
## Override this in child scripts (or connect to "interacted" signal externally).
func interact(_player: Node) -> void:
	if one_shot and _used:
		return
	_used = true
	_on_interact(_player)

## Override in subclasses.
func _on_interact(_player: Node) -> void:
	pass

## Called by Player's InteractionArea when player enters/exits range.
## Override to show/hide a prompt bubble above this object.
func on_player_nearby(is_near: bool) -> void:
	pass
