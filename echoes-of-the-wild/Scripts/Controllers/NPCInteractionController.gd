extends Node

var current_dialogue = []
var dialogue_index = 0

var npc = null
var dialogue_ui = null

func _ready():
	dialogue_ui = $"../DialogueUI"
func _process(delta):
	if Input.is_action_just_pressed("interact"):
		var npc = $"../NPC"
		if npc.player_near:
			start_dialogue(npc)

func start_dialogue(selected_npc):

	npc = selected_npc

	current_dialogue = npc.dialogues

	dialogue_index = 0

	dialogue_ui.show_dialogue(

		npc.npc_name,

		current_dialogue[dialogue_index]

	)


func next_dialogue():

	dialogue_index += 1

	if dialogue_index < current_dialogue.size():

		dialogue_ui.show_dialogue(

			npc.npc_name,

			current_dialogue[dialogue_index]

		)

	else:

		end_dialogue()
		
	

func end_dialogue():

	dialogue_ui.hide_dialogue()

	dialogue_index = 0

	current_dialogue.clear()

	npc = null
	
func _on_next_button_pressed():
	next_dialogue()
