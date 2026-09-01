extends CanvasLayer
class_name DialogueBox
## Story-Driven Adventure: minimal dialogue/narration popup.
## Node structure:
## DialogueBox (CanvasLayer, this script)
##  └─ Panel
##       └─ Label (this holds the text)
##
## Add this scene once to your main scene and add it to the "dialogue_box" group
## (already done in _ready) so other scripts can find it via get_first_node_in_group.

@export var letters_per_second: float = 40.0
@export var auto_hide_delay: float = 2.5  # seconds after text finishes before auto-hiding; 0 = stay open

@onready var panel: Control = $Panel
@onready var label: Label = $Panel/Label

var _full_text: String = ""
var _visible_chars: int = 0
var _typing: bool = false
var _hide_timer: Timer

func _ready() -> void:
	add_to_group("dialogue_box")
	panel.visible = false
	_hide_timer = Timer.new()
	_hide_timer.one_shot = true
	_hide_timer.timeout.connect(_hide_box)
	add_child(_hide_timer)

func show_text(text: String) -> void:
	_full_text = text
	_visible_chars = 0
	_typing = true
	panel.visible = true
	label.text = ""
	_hide_timer.stop()

func _process(delta: float) -> void:
	if not _typing:
		return
	_visible_chars += int(letters_per_second * delta) if letters_per_second * delta >= 1 else 1
	_visible_chars = min(_visible_chars, _full_text.length())
	label.text = _full_text.substr(0, _visible_chars)
	if _visible_chars >= _full_text.length():
		_typing = false
		if auto_hide_delay > 0.0:
			_hide_timer.start(auto_hide_delay)

func _unhandled_input(event: InputEvent) -> void:
	# Press interact/confirm to skip typing or dismiss early.
	if event.is_action_pressed("interact") and panel.visible:
		if _typing:
			_visible_chars = _full_text.length()
			label.text = _full_text
			_typing = false
		else:
			_hide_box()

func _hide_box() -> void:
	panel.visible = false
