extends Node



@onready var bgm_player: AudioStreamPlayer = AudioStreamPlayer.new()

func _ready() -> void:
	add_child(bgm_player)
	bgm_player.bus = &"Music"
	
	# Load the audio file dynamically
	var ambient_bgm: AudioStream = load("res://assets/music/ambient.mp3")
	if ambient_bgm:
		play_bgm(ambient_bgm, linear_to_db(5.0))

func play_bgm(stream: AudioStream, volume_db: float = 0.0) -> void:
	if bgm_player.stream == stream and bgm_player.playing:
		return
	bgm_player.stream = stream
	bgm_player.volume_db = volume_db
	bgm_player.play()

func stop_bgm() -> void:
	bgm_player.stop()
