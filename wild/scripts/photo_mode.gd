extends Node

## Key bind to trigger photo mode
@export var photo_key: Key = KEY_P
## Optional: NodePath to UI canvas layer to hide during snapshot
@export var ui_canvas_path: NodePath

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.is_echo():
		if event.keycode == photo_key:
			take_photo()

func take_photo() -> void:
	# 1. Hide UI temporarily
	var ui_node: CanvasLayer = get_node_or_null(ui_canvas_path) if ui_canvas_path else null
	if ui_node:
		ui_node.visible = false

	# Wait for the frame to render without the UI
	await RenderingServer.frame_post_draw

	# 2. Capture the viewport
	var img: Image = get_viewport().get_texture().get_image()

	# Restore UI visibility
	if ui_node:
		ui_node.visible = true

	# 3. Ensure save directory exists (`user://screenshots/`)
	var dir_path: String = "user://screenshots/"
	if not DirAccess.dir_exists_absolute(dir_path):
		DirAccess.make_dir_recursive_absolute(dir_path)

	# 4. Generate timestamped file name
	var datetime: Dictionary = Time.get_datetime_dict_from_system()
	var filename: String = "photo_%04d%02d%02d_%02d%02d%02d.png" % [
		datetime.year, datetime.month, datetime.day,
		datetime.hour, datetime.minute, datetime.second
	]
	var full_path: String = dir_path + filename

	# 5. Save image
	var err: Error = img.save_png(full_path)
	if err == OK:
		print("Photo saved successfully: ", OS.get_user_data_dir() + "/screenshots/" + filename)
	else:
		push_error("Failed to save photo. Error code: %d" % err)
