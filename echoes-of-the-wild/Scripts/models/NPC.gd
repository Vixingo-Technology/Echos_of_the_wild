
extends CharacterBody2D
var player_near = false
@export var npc_id : int = 1
@export var npc_name : String = "Forest Guardian"
@export var npc_type : String = "Guardian"

@export var dialogues : Array[String] = [
	"Welcome, traveler.",
	"The forest has been waiting for you.",
	"Restore the lost voices."
]


func _on_area_2d_body_entered(body):
	if body.name == "Player":
		player_near = true


func _on_area_2d_body_exited(body):
	if body.name == "Player":
		player_near = false
