extends Node2D

@onready var settings_menu: CanvasLayer = $SettingsMenu

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("ui_cancel"): # Listens for the ESC key by default
		settings_menu.visible = !settings_menu.visible