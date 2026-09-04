extends CanvasLayer

@onready var master_slider: HSlider = $Control/PanelContainer/VBoxContainer/HBoxContainer/MasterSlider
@onready var bgm_slider: HSlider = $Control/PanelContainer/VBoxContainer/HBoxContainer2/BGMSlider
@onready var close_button: Button = $Control/PanelContainer/VBoxContainer/CloseButton

func _ready() -> void:
	# Load initial UI state from SettingsManager
	master_slider.value = SettingsManager.settings["master_volume"]
	bgm_slider.value = SettingsManager.settings["bgm_volume"]

	# Connect control signals
	master_slider.value_changed.connect(_on_master_slider_changed)
	bgm_slider.value_changed.connect(_on_bgm_slider_changed)
	close_button.pressed.connect(_on_close_button_pressed)

func _on_master_slider_changed(value: float) -> void:
	SettingsManager.set_master_volume(value)
	SettingsManager.save_settings()

func _on_bgm_slider_changed(value: float) -> void:
	SettingsManager.set_bgm_volume(value)
	SettingsManager.save_settings()

func _on_close_button_pressed() -> void:
	hide()
