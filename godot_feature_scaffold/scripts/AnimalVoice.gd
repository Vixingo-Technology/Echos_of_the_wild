extends Interactable
class_name AnimalVoice
## Wildlife Restoration: a collectible "lost voice" of an animal.
## Node structure: AnimalVoice (Area2D, this script) with a Sprite2D + CollisionShape2D child.

@export var animal_id: String = "fox_01"       # unique id, used by GameManager
@export var animal_display_name: String = "Fox"
@export var lore_text: String = "A faint echo of a fox's call drifts back into the forest."
@export var restore_sfx: AudioStream
@export var restore_vfx_scene: PackedScene       # optional particle/effect scene to spawn

@onready var prompt_label: Node = get_node_or_null("PromptLabel")  # optional Label child

func _ready() -> void:
	super._ready()
	if prompt_label:
		prompt_label.visible = false

func _on_interact(player: Node) -> void:
	GameManager.restore_animal(animal_id)

	# Show story/dialogue text if a DialogueBox autoload/singleton exists in the scene.
	var dialogue := get_tree().get_first_node_in_group("dialogue_box")
	if dialogue and dialogue.has_method("show_text"):
		dialogue.show_text(lore_text)

	if restore_sfx:
		var player_audio := AudioStreamPlayer2D.new()
		player_audio.stream = restore_sfx
		player_audio.global_position = global_position
		get_tree().current_scene.add_child(player_audio)
		player_audio.play()
		player_audio.finished.connect(player_audio.queue_free)

	if restore_vfx_scene:
		var vfx := restore_vfx_scene.instantiate()
		vfx.global_position = global_position
		get_tree().current_scene.add_child(vfx)

	# Fade out and remove this collectible from the world.
	var tween := create_tween()
	tween.tween_property(self, "modulate:a", 0.0, 0.6)
	tween.tween_callback(queue_free)

func on_player_nearby(is_near: bool) -> void:
	if prompt_label:
		prompt_label.visible = is_near and not _used
