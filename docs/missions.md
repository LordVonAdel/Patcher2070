Missions are composed of multiple files:

## Files related to the whole map (used for multiple missions in the same area)
### .abl
Index for missions. Example `chapter01.abl`
```
[TITLE=CHAPTER 01]
{

[FILENAME=Chapter01_MISSION 0.abo]

[FILENAME=Chapter01_MISSION 1.abo]

[FILENAME=Chapter01_MISSION 2.abo]

[FILENAME=Chapter01_MISSION 3.abo]

[FILENAME=Chapter01_MISSION 4.abo]
}

```

### *.www
World size.
Positions/Names of islands.

### *.png
An image of the layout of the map. From the editor. not used ingame.

### *.seq


### *_airprofiles.xml

### *_assets.xml / *_features.xml / *_quests.xml / *_texts.xml
Overwrites for the files in /data/config/ ?

## Files for single missions
### *.abo
Contains triggers for a mission.
Whole syntax of the file is german. Comments in the base game missions are also in german.

Every command seems to be written in square brackets. Parameters are semicolon separated. Instructions can be nested in blocks. Comments are written inside the tag after the last parameter after a colon.

External filenames are always written as full path from game root with extension
Example filename
```
data\levels\campaign\ABL_Cinematics_CINEMATICS_OFF.abo
```

Example structure of a line
```
[AKTION=n200;SPIELER;0:Sets the value of SPIELER to 0.]
```

Player values are integers where the value is the index of the player. 0 = Human Player.

#### Types
| Type  | Description |
| ----- | ----------- |
| Variable | Holds a number |
| Switch | Holds a boolean |
| Timer | Counts constantly down |
| Island | Name of the island, defined in www file |
| Island Container | Structure that holds a set of island references |

Islands and island containers may be interchangeable as parameters

#### Aktionen
"Aktion" is german for "action".
| Aktion | Parameters | Description |
| ------ | ---------- | ----------- |
| n7     | playlistID | Starts music playlist on repeat |
| n8     |            | Play default music |
| n12    |            | Create savegame for next mission |
| n23    | timer, milliseconds | Sets an action timer |
| n50    | seconds    | Repeat trigger after a set amount of seconds |
| n62    | object type, unkown | Removes an object immediately |
| n63    | unit, unknown | Removes a unit immediately |
| n70    | island, player | Reveals an island |
| n88    | tons, ware, player, island | Sets the number of wares of a player on an island |
| n89    | tons, ware, player, island | Gives or removes a specific amount of ware from a harbour |
| n95    | player, minLevel, maxLevel | Clamps the happiness of all peoples of a specific player |
| n150   | object, object | Move object to object |
| n161   | (Credits/License?), player, amount, (2 = Set / 0 = Add) | Sets a value of a player |
| n180   |            | deselects everything |
| n200   | name, value | sets a variable |
| n201   | state (0=set / 1=reset), switch | reset switch |
| n303   | collection | Fill Buildings output products |
| n527   | meldung, character | Plays a message |
| n528   |            | Stops all third party messages |
| n580   | shot       | Starts a camera shot |
| n581   | effect, (1 = Stop)| Starts/Stops post effect (Post FX names in Anno2070Data.js) |
| n600   |            | Used for comments inside abo files |
| n670   | 0 = Hide / 1 = Show | Shows/Hides GUI |
| n885   | state (0 = Start / 2 = Block / 4 = Lost / 5 = Won), questID, player | Sets a quest state |
| n903   | objectType, (0=invincible / 1=vulnerable) | Makes all objects of type vulnerable. or not |
| n905   | unit, hitpoints, unknown(0) | Sets hits points of unit to value |
| n906   | playerId, IntermediateLevel | Unlock a IntermediateLevel |
| n908   | percentage, unkown(0), collection, buildingGUID | Upgrade percentage of buildings in collection to target building GUID |
| n909   | collection, 1=hide? | Makes objects invisible |
| n1000  | variable, variable, operation(0), amount(1) | Sets variable to variable plus value |
| n1020  | name       | Stops camera shot |
| n1031  | titleGUID, subtitleGUID | Displays Mission name |
| n1050  | operation(0=Add/2=Set), variableA, variableB | Sets A = B / Adds A onto B |
| n1051  | player, area, operation, collection | Adds all units of player in area to collection |
| n1061  | island container | Sets all islands to the specified island container |
| n1111  | 0 = Show / 1 = Hide | Hides/Shows the mouse cursor |
| n1112  | direction (0=Show / 1=Hide), filename | Fade screen |
| n1122  | player, player, status(War) | Sets diplomacy status between two players |
| n1134  | island, player, guid | Sets name of an island |
| n1135  | unit, target | Moves unit to target |
| n1136  | unit, target | Let unit attack something |
| n1141  | 0 = Stop / 1 = Start | Start Benchmark |
| n1142  | variable, building GUID, player, island | Stores the number of build buildings to a variable |
| n1143  | operation (2=set / 0 = Add), building GUID, player, island, collection | Stores buildings/units into a collection? |
| n1150  |              | Quits the game |
| n1161  | object, icon, hide (0 = Show/ 1 = Hide) | Shows/Hides an icon over an object |
| n1163  | player, guid, island?, name | Renames an object with guid of player (on island?) to name
| n1167  | (0 = deny) | Deny manual renaming of islands for the player |
| n1170  | (0 = activate / 1 = deactivate), player | deactivates messages about a player |
| n1180  | effect, target | Starts effect on target |
| n1300  | (0 = use), units | Enables units to be used by AI |
| n1452  | (0 = deactivate / 1 = activate), button (0 = STRATEGY_MAP_BUTTON, 1 = DIPLOMACY_MENU_BUTTON) | disables gui button |
| n1457  | building GUID | Force enables a building in the build menu |
| n1501  | amount, unkown(Base), island | Adds ecobalance to an island. negative amounts are allowed |
| n1503  | slot, ark guid, player, unknown(1), unkown(0), angle, name | Ark of player shows at location with animation |
| n1508  | filename   | Starts triggers from external file |
| n1513  | SoundGuid  | Plays a sound |
| n1514  | island, filename | Replaces an island |
| n1523  | ObjectGUID | Shows helper arrow for object |
| n1524  |            | Hides helper arrow |
| n1526  | 1, STRATEGY_MAP_BUTTON | Show helper arrow for the strategy map button |
| n1528  | sequence, object | Starts sequence at object |
| n1531  | guid, player/arch, player/arch | Spawn a unit for a player on an arch of a specified player |

#### Bedingungen
"Bedingung" is german for "condition"
Bedingungen are be prepended with `&` (for AND) or `|` (for OR). The prepend is optionally followed by `!` for negation.

| Bedingung | Parameters | Description |
| --------- | ---------- | ----------- |
| 1         |            | Always true |
| 6         | switch, state (0 = set / 1 = unset) | Check switch state |
| 16  	    | timer      | Is timer expired? |
| 28        | objectA, objectB, (1 = Less), fields | Check distance between objects |
| 62        | player, island, (1 = Less / 0 = At least), tons, ware | Player stored wares on island |
| 71        | unkown(0), unkown(0), amount, island | Player has reached inhabitants of specific state (0, 0 => player 0, at Least)|
| 73        | player, stage(Techs1) | Player reached game stage |
| 250       | key        | Is keyboard key pressed? |
| 300       | comment    | Used for comments |
| 280       | shot, 1=Stop | Camera shot stopped |
| 330       |            | Level started or loaded |
| 332       | missionIndex | Is mission running? |
| 440       | questID, quest name, player, (0 = started / 1 = finished) | Has the player started or finished a quest? |
| 1000      | variable, operator (0 = Equal / 2 = Greater / 3 = Less), value | Check variable value? |
| 1011      |            | is a third party message window open? |
| 1004      | player, area, layer(UnderWater/Water/Air) | has the player at least 1 ship at area |
| 1008      | player, island, unkown | Island discovered? |
| 1009      | unkown, unkown, amount, unkown | Player has less than amount of gold coins (I think they mean credits). |
| 1035      | player, (0 = Less / 2 = More), number, GUID | Player has more/less buildings of type worldwide |
| 1503      | player, island, 1, 2, value | Energy value greater than value? |