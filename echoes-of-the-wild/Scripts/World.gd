extends Node2D

const SPEED := 220.0
const WORLD_SIZE := Vector2(1800, 1000)
var player_pos := Vector2(360, 500)
var quest_active := false
var quest_complete := false
var restored_shrines := 0
var switches := [false, false, false]
var gate_open := false
var weather := "Clear"
var weather_clock := 0.0
var message_clock := 0.0
var map_open := false
var rain := []

@onready var info: Label = $UI/Info
@onready var quest_label: Label = $UI/QuestPanel/Quest
@onready var weather_label: Label = $UI/Weather
@onready var map_panel: ColorRect = $UI/MapPanel
@onready var map_text: Label = $UI/MapPanel/MapText

var guardian := Vector2(520, 430)
var shrine := Vector2(980, 340)
var signpost := Vector2(660, 690)
var puzzle_positions := [Vector2(1120, 650), Vector2(1260, 650), Vector2(1400, 650)]
var gate_pos := Vector2(1510, 570)

func _ready():
	for i in range(70):
		rain.append(Vector2((i * 137) % 1150, (i * 83) % 650))
	update_ui()
	show_message("Welcome to Echoes of the Wild. Move with WASD/arrow keys. Press E near objects.")
	queue_redraw()

func _process(delta):
	var dir := Input.get_vector("move_left", "move_right", "move_up", "move_down")
	if not map_open:
		player_pos += dir * SPEED * delta
		player_pos.x = clamp(player_pos.x, 60.0, WORLD_SIZE.x - 60.0)
		player_pos.y = clamp(player_pos.y, 80.0, WORLD_SIZE.y - 60.0)

	if Input.is_action_just_pressed("interact") and not map_open:
		interact()
	if Input.is_action_just_pressed("toggle_map"):
		map_open = not map_open
		map_panel.visible = map_open
		update_map()
	if Input.is_action_just_pressed("toggle_quests"):
		$UI/QuestPanel.visible = not $UI/QuestPanel.visible
	if Input.is_action_just_pressed("change_weather"):
		cycle_weather()

	weather_clock += delta
	if weather_clock >= 25.0:
		weather_clock = 0.0
		cycle_weather()
	if message_clock > 0:
		message_clock -= delta
		if message_clock <= 0:
			info.text = "E: interact   Q: quests   M: map   T: weather"
	queue_redraw()

func interact():
	if player_pos.distance_to(guardian) < 90:
		if not quest_active:
			quest_active = true
			show_message("Forest Guardian: Restore the ancient shrine to heal this part of the forest.")
		else:
			show_message("Forest Guardian: Follow the golden path east to the shrine.")
		update_ui()
		return
	if player_pos.distance_to(shrine) < 90:
		if not quest_active:
			show_message("The shrine is dormant. Perhaps someone nearby knows its purpose.")
		elif restored_shrines == 0:
			restored_shrines = 1
			quest_complete = true
			show_message("Shrine restored! Quest complete: Voice of the Forest.")
			update_ui()
		else:
			show_message("The restored shrine hums with life.")
		return
	if player_pos.distance_to(signpost) < 85:
		show_message("Sign: Guardian ←   Shrine →   Stone puzzle ↘")
		return
	for i in range(puzzle_positions.size()):
		if player_pos.distance_to(puzzle_positions[i]) < 75:
			if not switches[i]:
				switches[i] = true
				show_message("Rune stone %d activated." % (i + 1))
				if switches.all(func(v): return v):
					gate_open = true
					show_message("Puzzle solved! The ancient gate has opened.")
			else:
				show_message("This rune stone is already glowing.")
			return
	show_message("Nothing nearby to interact with.")

func cycle_weather():
	if weather == "Clear": weather = "Rain"
	elif weather == "Rain": weather = "Fog"
	else: weather = "Clear"
	weather_label.text = "Weather: " + weather
	show_message("Weather changed to " + weather + ".")

func show_message(text: String):
	info.text = text
	message_clock = 5.0

func update_ui():
	if not quest_active:
		quest_label.text = "QUESTS (Q)\nNo active quest.\nTalk to the Forest Guardian."
	elif not quest_complete:
		quest_label.text = "QUESTS (Q)\nVoice of the Forest\nObjective: Restore the ancient shrine.\nProgress: %d/1" % restored_shrines
	else:
		quest_label.text = "QUESTS (Q)\n✓ Voice of the Forest\nCompleted: Ancient shrine restored."
	weather_label.text = "Weather: " + weather

func update_map():
	map_text.text = "FOREST MAP\n\n  G  Guardian\n\n        S  Shrine\n\n              ① ② ③  Rune Stones\n                    ▯ Gate\n\nYou are the blue marker.\nPress M to close map."

func _draw():
	# Ground and paths
	draw_rect(Rect2(Vector2.ZERO, WORLD_SIZE), Color("#294d32"))
	for x in range(100, 1750, 150):
		for y in range(120, 950, 160):
			draw_circle(Vector2(x + (y % 70), y), 28, Color("#173a25"))
	draw_line(Vector2(420,500), Vector2(1050,390), Color("#b39a62"), 38)
	draw_line(Vector2(1020,400), Vector2(1450,650), Color("#b39a62"), 38)
	# Pond
	draw_circle(Vector2(780,780), 115, Color("#356f8a"))
	# Guardian
	draw_circle(guardian, 28, Color("#d8b45c"))
	draw_string(ThemeDB.fallback_font, guardian + Vector2(-52,-42), "Forest Guardian", HORIZONTAL_ALIGNMENT_LEFT, -1, 18, Color.WHITE)
	# Shrine
	draw_rect(Rect2(shrine-Vector2(38,38), Vector2(76,76)), Color("#55c987") if restored_shrines else Color("#77736d"))
	draw_string(ThemeDB.fallback_font, shrine + Vector2(-28,-52), "Shrine", HORIZONTAL_ALIGNMENT_LEFT, -1, 18, Color.WHITE)
	# Sign
	draw_rect(Rect2(signpost-Vector2(8,35), Vector2(16,70)), Color("#704d2c"))
	draw_rect(Rect2(signpost+Vector2(-40,-35), Vector2(80,35)), Color("#a8783e"))
	# Puzzle stones
	for i in range(3):
		var c = Color("#f3cc55") if switches[i] else Color("#6c7180")
		draw_circle(puzzle_positions[i], 30, c)
		draw_string(ThemeDB.fallback_font, puzzle_positions[i]+Vector2(-6,7), str(i+1), HORIZONTAL_ALIGNMENT_LEFT, -1, 18, Color.BLACK)
	# Gate
	if not gate_open:
		draw_rect(Rect2(gate_pos-Vector2(12,80), Vector2(24,160)), Color("#50351f"))
		draw_string(ThemeDB.fallback_font, gate_pos+Vector2(-42,-95), "Locked Gate", HORIZONTAL_ALIGNMENT_LEFT, -1, 17, Color.WHITE)
	else:
		draw_string(ThemeDB.fallback_font, gate_pos+Vector2(-42,-30), "Gate Open", HORIZONTAL_ALIGNMENT_LEFT, -1, 17, Color("#a6ffb4"))
	# Player
	draw_circle(player_pos, 20, Color("#62b5ff"))
	draw_circle(player_pos, 7, Color.WHITE)
	# Weather overlays
	if weather == "Rain":
		for p in rain:
			var rp = p + Vector2(fmod(Time.get_ticks_msec()/7.0, 40.0), fmod(Time.get_ticks_msec()/4.0, 80.0))
			draw_line(rp, rp+Vector2(-8,18), Color(0.7,0.85,1,0.65), 2)
	elif weather == "Fog":
		draw_rect(Rect2(Vector2.ZERO, Vector2(1200,700)), Color(0.8,0.85,0.82,0.28))
