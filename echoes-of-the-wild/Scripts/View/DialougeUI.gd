extends CanvasLayer

@onready var npc_name_label = $Panel/VBoxContainer/NPCName
@onready var dialogue_label = $Panel/VBoxContainer/DialogueText
@onready var next_button = $Panel/VBoxContainer/NextButton

func _ready():
	hide()

func show_dialogue(npc_name: String, text: String):
	npc_name_label.text = npc_name
	dialogue_label.text = text
	show()

func hide_dialogue():
	hide()
