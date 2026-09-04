extends Node

const SAVE_PATH = "user://settings.json"

var settings: Dictionary = {
	"master_volume": 0.8,
	"bgm_volume": 0.8,
	"fullscreen": false,
	"vsync": true
}

func _ready() -> void:
	load_settings()
	apply_all_settings()

func apply_all_settings() -> void:
	set_master_volume(settings["master_volume"])
	set_bgm_volume(settings["bgm_volume"])
	set_fullscreen(settings["fullscreen"])
	set_vsync(settings["vsync"])

# --- AUDIO SETTINGS ---
func set_master_volume(value: float) -> void:
	settings["master_volume"] = value
	var bus_idx = AudioServer.get_bus_index("Master")
	if bus_idx != -1:
		AudioServer.set_bus_volume_db(bus_idx, linear_to_db(value))
		AudioServer.set_bus_mute(bus_idx, value <= 0.001)

func set_bgm_volume(value: float) -> void:
	settings["bgm_volume"] = value
	var bus_idx = AudioServer.get_bus_index("Music")
	if bus_idx == -1:
		bus_idx = AudioServer.get_bus_index("Master")
	AudioServer.set_bus_volume_db(bus_idx, linear_to_db(value))

# --- PERFORMANCE / GRAPHICS SETTINGS ---
func set_fullscreen(enabled: bool) -> void:
	settings["fullscreen"] = enabled
	if enabled:
		DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_FULLSCREEN)
	else:
		DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_WINDOWED)

func set_vsync(enabled: bool) -> void:
	settings["vsync"] = enabled
	if enabled:
		DisplayServer.window_set_vsync_mode(DisplayServer.VSYNC_ENABLED)
	else:
		DisplayServer.window_set_vsync_mode(DisplayServer.VSYNC_DISABLED)

# --- SAVE & LOAD ---
func save_settings() -> void:
	var file = FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if file:
		file.store_string(JSON.stringify(settings, "\t"))

func load_settings() -> void:
	if not FileAccess.file_exists(SAVE_PATH):
		return
	var file = FileAccess.open(SAVE_PATH, FileAccess.READ)
	if file:
		var json = JSON.new()
		if json.parse(file.get_as_text()) == OK:
			var loaded_data = json.get_data()
			if typeof(loaded_data) == TYPE_DICTIONARY:
				for key in loaded_data:
					settings[key] = loaded_data[key]
