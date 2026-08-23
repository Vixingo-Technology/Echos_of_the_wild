extends CharacterBody2D


const SPEED = 130.0
const JUMP_VELOCITY = -300.0
const DOUBLE_JUMP_VELOCITY = -260.0
const MAX_JUMPS = 2

const WALL_SLIDE_SPEED = 40.0
const WALL_CLIMB_SPEED = 55.0
const WALL_JUMP_SPEED_X = 200.0
const WALL_JUMP_VELOCITY_Y = -280.0

const GLIDE_GRAVITY_SCALE = 0.15
const GLIDE_MAX_FALL = 40.0

const ROLL_SPEED = 260.0
const BOUNCE_VELOCITY = -220.0
const KNOCKBACK_SPEED = 180.0
const MAX_HEALTH = 3
const HURT_DURATION = 0.4
const ROLL_DURATION = 0.35
const INVULN_DURATION = 1.0

@onready var sprite: AnimatedSprite2D = $AnimatedSprite2D
@onready var hurt_sound: AudioStreamPlayer2D = $HurtSound
@onready var death_sound: AudioStreamPlayer2D = $DeathSound

# Traversal abilities. Default to unlocked for now; wire these up to pickups
# once the ability-progression/inventory systems land.
@export var can_double_jump := true
@export var can_wall_climb := true
@export var can_glide := true

var health := MAX_HEALTH
var is_dead := false
var is_hurt := false
var is_rolling := false
var invulnerable := false
var is_gliding := false
var facing := 1
var jumps_left := MAX_JUMPS


func _ready() -> void:
	add_to_group("player")


func _physics_process(delta: float) -> void:
	if is_dead:
		return

	# Flicker while invulnerable so damage feedback is visible.
	if invulnerable:
		sprite.modulate.a = 1.0 if int(Time.get_ticks_msec() / 80) % 2 == 0 else 0.4
	else:
		sprite.modulate.a = 1.0

	if is_hurt or is_rolling:
		if not is_on_floor():
			velocity += get_gravity() * delta
		move_and_slide()
		return

	var direction := Input.get_axis("ui_left", "ui_right")

	var touching_wall := can_wall_climb and not is_on_floor() and is_on_wall_only()
	var wall_normal: Vector2 = get_wall_normal() if touching_wall else Vector2.ZERO
	var wall_dir: float = signf(wall_normal.x)
	var pressing_into_wall: bool = touching_wall and direction != 0.0 and signf(direction) == -wall_dir

	if is_on_floor() or pressing_into_wall:
		jumps_left = MAX_JUMPS

	# Vertical motion: wall-slide/climb, glide, or normal gravity.
	if is_on_floor():
		is_gliding = false
	elif pressing_into_wall:
		is_gliding = false
		if Input.is_action_pressed("ui_up"):
			velocity.y = -WALL_CLIMB_SPEED
		else:
			velocity.y = min(velocity.y + get_gravity().y * delta, WALL_SLIDE_SPEED)
	elif can_glide and Input.is_action_pressed("ui_accept") and velocity.y > 0.0:
		is_gliding = true
		velocity.y = min(velocity.y + get_gravity().y * delta * GLIDE_GRAVITY_SCALE, GLIDE_MAX_FALL)
	else:
		is_gliding = false
		velocity += get_gravity() * delta

	# Jumping: ground jump, wall jump, or double jump.
	if Input.is_action_just_pressed("ui_accept"):
		if is_on_floor():
			velocity.y = JUMP_VELOCITY
			jumps_left = MAX_JUMPS - 1
		elif pressing_into_wall:
			velocity = Vector2(wall_normal.x * WALL_JUMP_SPEED_X, WALL_JUMP_VELOCITY_Y)
			facing = 1 if wall_normal.x > 0 else -1
			jumps_left = MAX_JUMPS - 1
		elif can_double_jump and jumps_left > 0:
			velocity.y = DOUBLE_JUMP_VELOCITY
			jumps_left -= 1

	if Input.is_action_just_pressed("roll") and is_on_floor() and not is_rolling:
		_start_roll()
		return

	# Get the input direction and handle the movement/deceleration.
	# As good practice, you should replace UI actions with custom gameplay actions.
	if direction:
		velocity.x = direction * SPEED
		sprite.flip_h = direction < 0
		facing = 1 if direction > 0 else -1
	else:
		velocity.x = move_toward(velocity.x, 0, SPEED)

	move_and_slide()
	_update_animation(pressing_into_wall)


func _update_animation(touching_wall: bool) -> void:
	# NOTE: the knight spritesheet has no dedicated wall-cling or glide frames,
	# so these reuse the closest existing poses as placeholders.
	if touching_wall:
		sprite.play("idle")
	elif is_gliding:
		sprite.play("roll")
	elif abs(velocity.x) > 5.0:
		sprite.play("run")
	else:
		sprite.play("idle")


func _start_roll() -> void:
	is_rolling = true
	invulnerable = true
	velocity.x = ROLL_SPEED * facing
	sprite.play("roll")
	await get_tree().create_timer(ROLL_DURATION).timeout
	is_rolling = false
	invulnerable = false


## Called by enemies when they hit the player.
func take_damage(amount: int, source_position: Vector2) -> void:
	if invulnerable or is_dead:
		return

	health -= amount
	if health <= 0:
		_die()
		return

	is_hurt = true
	invulnerable = true
	sprite.play("hit")
	hurt_sound.play()

	var away := signf(global_position.x - source_position.x)
	if away == 0.0:
		away = -facing
	velocity = Vector2(away * KNOCKBACK_SPEED, -150.0)

	await get_tree().create_timer(HURT_DURATION).timeout
	is_hurt = false
	await get_tree().create_timer(INVULN_DURATION - HURT_DURATION).timeout
	invulnerable = false


## Called by enemies when the player stomps on top of them.
func bounce() -> void:
	velocity.y = BOUNCE_VELOCITY
	jumps_left = MAX_JUMPS


func _die() -> void:
	is_dead = true
	is_hurt = false
	is_rolling = false
	velocity = Vector2.ZERO
	sprite.play("death")
	death_sound.play()
	await get_tree().create_timer(1.2).timeout
	get_tree().reload_current_scene()
