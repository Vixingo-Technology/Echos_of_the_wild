extends CharacterBody2D


const SPEED = 30.0

@onready var sprite: AnimatedSprite2D = $AnimatedSprite2D
@onready var hurt_box: Area2D = $HurtBox
@onready var wall_check: RayCast2D = $WallCheck
@onready var floor_check: RayCast2D = $FloorCheck
@onready var death_sound: AudioStreamPlayer2D = $DeathSound

var direction := -1
var is_dead := false


func _ready() -> void:
	add_to_group("enemies")
	sprite.play("move")
	hurt_box.body_entered.connect(_on_hurt_box_body_entered)


func _physics_process(delta: float) -> void:
	if is_dead:
		return

	if not is_on_floor():
		velocity += get_gravity() * delta

	# Update the patrol sensors to look ahead in the current direction.
	wall_check.target_position.x = 10 * direction
	floor_check.position.x = 10 * direction

	if wall_check.is_colliding() or not floor_check.is_colliding():
		direction *= -1

	velocity.x = direction * SPEED
	sprite.flip_h = direction > 0

	move_and_slide()


func _on_hurt_box_body_entered(body: Node) -> void:
	if is_dead or not body.is_in_group("player"):
		return

	var player := body as CharacterBody2D

	# A player rolling into the slime defeats it outright (dash-attack).
	if "is_rolling" in player and player.is_rolling:
		_die()
		return

	# Landing on top of the slime (stomp) also defeats it and bounces the player.
	var stomped: bool = player.global_position.y < global_position.y - 4.0 and player.velocity.y >= 0.0
	if stomped:
		_die()
		if player.has_method("bounce"):
			player.bounce()
	elif player.has_method("take_damage"):
		player.take_damage(1, global_position)


func _die() -> void:
	is_dead = true
	sprite.play("hurt")
	death_sound.play()
	set_physics_process(false)
	hurt_box.set_deferred("monitoring", false)
	$CollisionShape2D.set_deferred("disabled", true)
	await get_tree().create_timer(0.1).timeout
	var tween := create_tween()
	tween.tween_property(sprite, "scale", Vector2(1.0, 0.2), 0.15)
	tween.parallel().tween_property(sprite, "modulate:a", 0.0, 0.2)
	await tween.finished
	queue_free()
