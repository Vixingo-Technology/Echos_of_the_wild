extends CharacterBody2D
## Open World Exploration: top-down player controller.
## Node structure expected:
## Player (CharacterBody2D, this script)
##  ├─ Sprite2D / AnimatedSprite2D
##  ├─ CollisionShape2D
##  └─ InteractionArea (Area2D)
##       └─ CollisionShape2D (a small radius circle, e.g. 32px)

@export var move_speed: float = 220.0
@export var acceleration: float = 1200.0
@export var friction: float = 1000.0

var _nearby_interactables: Array[Node] = []
var _current_target: Node = null

@onready var interaction_area: Area2D = $InteractionArea

func _ready() -> void:
	interaction_area.area_entered.connect(_on_interaction_area_entered)
	interaction_area.area_exited.connect(_on_interaction_area_exited)

func _physics_process(delta: float) -> void:
	_handle_movement(delta)
	_handle_interaction_input()

func _handle_movement(delta: float) -> void:
	# Uses Input Map actions: move_left, move_right, move_up, move_down.
	# Add these in Project Settings > Input Map if they don't exist yet.
	var input_dir := Input.get_vector("move_left", "move_right", "move_up", "move_down")

	if input_dir != Vector2.ZERO:
		velocity = velocity.move_toward(input_dir * move_speed, acceleration * delta)
	else:
		velocity = velocity.move_toward(Vector2.ZERO, friction * delta)

	move_and_slide()

func _handle_interaction_input() -> void:
	_update_current_target()
	if Input.is_action_just_pressed("interact") and _current_target:
		if _current_target.has_method("interact"):
			_current_target.interact(self)

func _update_current_target() -> void:
	# Picks the closest valid interactable in range each frame.
	_current_target = null
	var closest_dist := INF
	for node in _nearby_interactables:
		if not is_instance_valid(node):
			continue
		var dist := global_position.distance_to(node.global_position)
		if dist < closest_dist:
			closest_dist = dist
			_current_target = node

func _on_interaction_area_entered(area: Area2D) -> void:
	if area.is_in_group("interactable"):
		_nearby_interactables.append(area)
		if area.has_method("on_player_nearby"):
			area.on_player_nearby(true)

func _on_interaction_area_exited(area: Area2D) -> void:
	_nearby_interactables.erase(area)
	if is_instance_valid(area) and area.has_method("on_player_nearby"):
		area.on_player_nearby(false)
