extends Area2D
class_name StoryTrigger
## Story-Driven Adventure: an invisible trigger zone that reveals narrative
## when the player enters, optionally gated by a required story flag
## (so later chapters only appear once earlier ones are unlocked).
##
## Node structure: StoryTrigger (Area2D, this script) + CollisionShape2D child.

@export var narrative_text: String = ""
@export var required_flag: String = ""     # leave empty for no requirement
@export var sets_flag: String = ""         # flag to set once this trigger fires
@export var trigger_once: bool = true

var _fired: bool = false

func _ready() -> void:
	body_entered.connect(_on_body_entered)

func _on_body_entered(body: Node) -> void:
	if trigger_once and _fired:
		return
	if not body.is_in_group("player"):
		return
	if required_flag != "" and not GameManager.is_flag_set(required_flag):
		return

	_fired = true
	var dialogue := get_tree().get_first_node_in_group("dialogue_box")
	if dialogue and dialogue.has_method("show_text"):
		dialogue.show_text(narrative_text)

	if sets_flag != "":
		GameManager.set_story_flag(sets_flag)

	if trigger_once:
		set_deferred("monitoring", false)
