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
| Position Container | Container representing a position? |
| Unit Container | Container containing multiple units |
| Building Container | Container containing multiple buildings |
| Object Container | Maybe unit and building container? |

Islands and island containers may be interchangeable as parameters. It is unknown if there is only one container type or if these are specific containers for each type.

#### Aktionen
"Aktion" is german for "action".
| Aktion | Parameters | Description |
| ------ | ---------- | ----------- |
| n7     | playlistID | Starts music playlist on repeat |
| n8     |            | Play default music |
| n10    | player     | Ends the game for player as defeat |
| n11    | player     | Ends the game for player as victory |
| n12    |            | Create savegame for next mission |
| n13    | unit       | Selects a unit |
| n14    | unit, player | Changes color of a unit to a specific player |
| n23    | timer, milliseconds | Sets an action timer |
| n24    | timer | Clears a timer |
| n50    | seconds    | Repeat trigger after a set amount of seconds |
| n57    | unit guid, variation, direction(degree), player, position, name | Spawns a unit |
| n59    | unit guid, variation, direction(degree), player, area, name | Spawns a in an area |
| n62    | object type, unknown | Removes an object immediately |
| n63    | unit, unknown | Removes a unit immediately |
| n64    | variableA, variableB | Adds hitpoints of A to B |
| n65    | variableA, variableB | Sets optical damage from A to B |
| n70    | island, player | Reveals an island |
| n74    | player | Reveala entire map |
| n88    | tons, ware, player, island | Sets the number of wares of a player on an island |
| n89    | tons, ware, player, island | Gives or removes a specific amount of ware from a harbour |
| n90    | item guid, player, island, unknown(0) | Transfers item from depot to island? |
| n95    | player, minLevel, maxLevel | Clamps the happiness of all peoples of a specific player |
| n150   | object, object | Move object to object |
| n161   | (Credits/License?), player, amount, (2 = Set / 0 = Add) | Sets a value of a player |
| n173   | research guid, player | Sets research trigger for a player |
| n180   |            | deselects everything |
| n200   | name, value | sets a variable |
| n201   | state (0=set / 1=reset), switch | reset switch |
| n203   | variable, min, max | Sets a random value to a variable |
| n301   | unknown(0), player | Fills all productions and farms of a player with their end products |
| n303   | collection | Fill Buildings output products |
| n508   | position container | Sets a marker on a position |
| n527   | meldung, character | Plays a message |
| n528   |            | Stops all third party messages |
| n580   | shot       | Starts a camera shot |
| n581   | effect, (1 = Stop)| Starts/Stops post effect (Post FX names in Anno2070Data.js) |
| n600   |            | Used for comments inside abo files |
| n670   | 0 = Hide / 1 = Show | Shows/Hides GUI |
| n885   | state (0 = Start / 2 = Block / 4 = Lost / 5 = Won), questID, player | Sets a quest state |
| n889   | quest guid, object container | Ping all objects of type from quest |
| n900   | amount, products, object? | Loads products onto ships from object |
| n903   | objectType, (0=invincible / 1=vulnerable) | Makes all objects of type vulnerable. or not |
| n905   | unit, hitpoints, unknown(0) | Sets hits points of unit to value |
| n906   | playerId, IntermediateLevel | Unlock a IntermediateLevel |
| n907   | item guid, container, unknown(0) | Loads item onto ships from somewhere? |
| n908   | percentage, unknown(0), collection, buildingGUID | Upgrade percentage of buildings in collection to target building GUID |
| n909   | collection, 1=hide? | Makes objects invisible |
| n910   | playerA, playerB | Player A discovers player B |
| n1000  | variable, variable, operation(0), amount(1) | Sets variable to variable plus value |
| n1020  | name       | Stops camera shot |
| n1031  | titleGUID, subtitleGUID | Displays Mission name |
| n1050  | operation(0=Add/2=Set), variableA, variableB | Sets A = B / Adds A onto B |
| n1051  | player, area, operation, collection | Adds all units of player in area to collection |
| n1060  | unknown(0), variableA, variableB | Adds A onto B |
| n1061  | island container | Sets all islands to the specified island container |
| n1070  | unknown(0), areaA, areaB | Adds areaA to areaB |
| n1080  | position container, (0=Center), area | Sets position container to area |
| n1081  | position container, (0=Center), area | Sets position container to area |
| n1099  | route, from state(Rival), to state(0=STANDARD) | Sets state of a trading route |
| n1100  | island container, player | Changes color of all buildings on islands in island container the the specified player |
| n1110  | unknown(0) | ENABLE infoplayer icons. |
| n1111  | 0 = Show / 1 = Hide | Hides/Shows the mouse cursor |
| n1112  | direction (0=Show / 1=Hide), filename | Fade screen |
| n1115  | unknown(0) | Enables ingame messages |
| n1117  | population stage, island/container?, player, percent | Sets the population of a specific player on a specific player of a specific population stage to a specific percentage |
| n1119  | unknown(0) | Activates hover effects under mouse |
| n1120  | unknown(0) | Activates third party menu (Diplomacy?)|
| n1122  | player, player, status(War) | Sets diplomacy status between two players |
| n1123  | Item guid, player, island | Puts item into storage of island |
| n1124  | Item guid, island | Puts item onto island and mounts it |
| n1126  | unit, (0 = DEFEND) | Change combat mode of unit |
| n1128  | player, route descriptor, game name | Creates a trade route for a player |
| n1129  | route descriptor, route player, target player, island | Adds a stop on a trade route |
| n1130  | route descriptor, route player, (1 = depot to ship), product, amount, target player, target island | Adds a trade route order |
| n1131  | unit, route | Adds ship to trade route |
| n1134  | island, player, guid | Sets name of an island |
| n1135  | unit, target | Moves unit to target |
| n1136  | unit, target | Let unit attack something |
| n1137  | (0 = Start / 1 = Stop), building | Changes production of building |
| n1138  | (0 = Start / 1 = Stop), container | Changes production of buildings |
| n1139  | object guid, island, new name | Changes name of an object |
| n1141  | 0 = Stop / 1 = Start | Start Benchmark |
| n1142  | variable, building GUID, player, island | Stores the number of build buildings to a variable |
| n1143  | operation (2=set / 0 = Add), building GUID, player, island, collection | Stores buildings/units into a collection? |
| n1145  | player, (1 = not mounted), item guid, new name | Changes name of a ship with or without an mounted item |
| n1146  | timer, text, milliseconds | Shows a red blinking text as mission timer when timer is under a specific value |
| n1147  |              | Hides all mission timers |
| n1148  | (0 = Enable / 1 = Disable) | Changes state of undiscovered layer |
| n1149  | (0 = Enable / 1 = Disable)| Enables/Disables Cinemascope |
| n1150  |              | Quits the game and goes back to windows |
| n1151  |              | Disables keystroke blockage |
| n1152  | (0 = Escape), (1 = Remove) | Removes keystroke blockage for specific key |
| n1156  | amount, item guid, container | Unloads and distributes unmounted items to objects | 
| n1161  | object, icon (ABLQuest), hide (0 = Show/ 1 = Hide) | Shows/Hides an icon over an object |
| n1163  | player, guid, island?, name | Renames an object with guid of player (on island?) to name |
| n1165  | route descriptor, route player, (0 = depot to ship), product, amount, target object/island/whatever | Adds action to trade route. Transfers product until a specified amount |
| n1166  | (1 = Enable), key (0 = Escape) | Enables a key |
| n1167  | (0 = deny) | Deny manual renaming of islands for the player |
| n1168  | amount, product, player | Removes a specific amount of a product from a player. Any depot/ship/flotsam |
| n1169  | amount, guid, player | Removes item from player (on ship/island/flotsam) | 
| n1170  | (0 = activate / 1 = deactivate), player | deactivates messages about a player |
| n1171  | unit, icon, unknown(1) | Shows/Hides an icon above a unit | 
| n1180  | effect, target | Starts effect on target |
| n1187  | player, faction, state (War) | Sets diplomacy status between two players |
| n1190  | position container, (2 = Quake) , unknown(50), unknown(2000), unknown(2000), unknown(1000) | Starts camera shake at position |
| n1200  | unknown(variable), assembly list, player, interval milliseconds, (1 = ignore build allowance) | Starts assembly list for player |
| n1300  | (0 = use), units | Enables units to be used by AI |
| n1303  | units, area, radius | Lets units defend an area |
| n1452  | unknown(0), unknown(1) | Highlights Strategy map button |
| n1452  | (0 = deactivate / 1 = activate), button (0 = STRATEGY_MAP_BUTTON, 1 = DIPLOMACY_MENU_BUTTON) | disables gui button |
| n1455  |            | Disables player guidance |
| n1456  | unknown(1) | Enables filter for build menu |
| n1457  | building GUID | Force enables a building in the build menu |
| n1480  | message, state (1 = Off) | Sets state of message |
| n1501  | amount, unknown(Base / EcosEcobalanceBuilding), island | Adds ecobalance to an island. negative amounts are allowed |
| n1503  | slot, ark guid, player, unknown(1), unknown(0), angle, name | Ark of player shows at location with animation |
| n1505  | player, player, unknown(0) | Share discovered area between players |
| n1506  | filepath, canvas | Plays a video on a canvas |
| n1508  | filepath   | Starts triggers from external file |
| n1509  | unknown(1) | Disables all sounds in pause mode |
| n1513  | SoundGuid  | Plays a sound |
| n1514  | island, filename | Replaces an island |
| n1515  | guid       | Sends a mail |
| n1516  | position?/container?/unit?, duration (-1 infinite), state (1 = Already distributed) | Starts an oil spill event |
| n1517  | duration   | Stops an oil spill event with fadeout |
| n1518  | unknown(0), units, bobcondition (4 = EffectTrigger03) | Sets a Bobcondition??? on objects |
| n1520  | guid, unknown(TsunamiShip) | Starts something at somewhere? |
| n1521  | island, profileA, profileB, duration in seconds | Fades from one light profile to another on an island in a specified time |
| n1522  | unknown(BELOW), name | Renames are of player/faction? |
| n1523  | ObjectGUID | Shows helper arrow for object |
| n1524  |            | Hides helper arrow |
| n1525  | AI, island | Starts specific AI on island |
| n1526  | 1, STRATEGY_MAP_BUTTON | Show helper arrow for the strategy map button |
| n1527  | item guid  | Show helper arrow for item |
| n1528  | sequence, object | Starts sequence at object |
| n1529  | effect, container?, containeR? | Starts effect at something and remembers ALID at something??? |
| n1530  | effect | Removes effect |
| n1531  | guid, player/arch, player/arch | Spawn a unit for a player on an arch of a specified player |
| n1532  | item gui   | Shows helper arrow to item in Lab menu |
| n1533  | action guid, player | Show helper arrow for action in Diplomacy menu |
| n1534  | island(filepath), (1 = Disable) | Disables harbor feedback for island |

#### Bedingungen
"Bedingung" is german for "condition"
Bedingungen are prepended with `&` (for AND) or `|` (for OR). The prepend is optionally followed by `!` for negation.

| Bedingung | Parameters | Description |
| --------- | ---------- | ----------- |
| 1         |            | Always true |
| 6         | switch, state (0 = set / 1 = unset) | Check switch state |
| 16  	    | timer      | Is timer expired? |
| 23        | object, unknown(0) | Does object still exists? |
| 27        | object, area, layer | Is object in area on layer? |
| 28        | objectA, objectB, (1 = Less), fields | Check distance between objects |
| 29        | container, container, (1 = Less), fields | Is one pair of objects from the containers at a specific distance? |
| 35        | object, unknown(0) | Is object selected? |
| 36        | container, unknown(0) | Is object in container selected? |
| 62        | player, island, (1 = Less / 0 = At least), tons, ware | Player stored wares on island |
| 63        | container, operator (0 = At least), amount, product | Are products of amount stored in units in container? |
| 69        | player, operator (1 = Less), amount, product | Player has amount of product over all islands und units |
| 71        | unknown(0), unknown(0), amount, island | Player has reached inhabitants of specific state (0, 0 => player 0, at Least)|
| 73        | player, stage(Techs1) | Player reached game stage |
| 77        | player, island, operator (0 = At least), amount, product | Player has amount of product on island |
| 79        | player, operator (0 = At least), amount, item guid | Player has stored items amount over all island and ships? |
| 250       | key        | Is keyboard key pressed? |
| 280       | camera shot, (1 = Stopped) | Check state of camera shot |
| 300       | comment    | Used for comments |
| 332       | index      | Is mission running? |
| 280       | shot, 1=Stop | Camera shot stopped |
| 330       |            | Level started or loaded |
| 332       | missionIndex | Is mission running? |
| 440       | questID, quest name, player, (0 = started / 1 = finished) | Has the player started or finished a quest? |
| 480       | unknown(0), containerA, unknown(0), containerB | Are all objects of containerA connected to all objects of containerB by roads? |
| 482       | object, object guid | Is object affected by object of type? |
| 483       | objects, player | Does player own all objects? |
| 484       | container, operator (5 = LessOrEqual), value, unknown(1) | Hitpoints of every object in container compared to value? |
| 1000      | variable, operator (0 = Equal / 1 = NotEqual / 2 = Greater / 3 = Less), value | Check variable value? |
| 1001      | player, island, operator (0 = Less / 2 = Greater), compare value, object guid | Has player more/less objects of a kind on an island? |
| 1002      | player, islands, operator, compare value, object guid, layers | Has player more/less objects of a kind on an island on an layer? |
| 1003      | player, amount, product, player load, island load, player unload, island unload | Has the player a trade route where at least a specific amount of a product is transported from one island to another? | 
| 1004      | player, area, layer(UnderWater/Water/Air) | has the player at least 1 ship at area |
| 1005      | player, amount operator (1 = Equal), amount, product, area, layer | Does the player have a ship with a product at a specific area on a specific layer |
| 1006      | player, unknown (0 = mounted / 2 = mounted and activated), item GUID, area, layer(Water) | has Player a unit with a mounted item?
| 1008      | player, island, unknown | Island discovered? |
| 1009      | unknown, unknown, amount, unknown | Player has less than amount of gold coins (I think they mean credits). |
| 1010      | unknown() | Is a virtual key pressed? |
| 1011      |            | is a third party message window open? |
| 1021      | player, island, operator (0 = Less), amount, item guid | Player has mounted item on island? |
| 1023      | building GUID, player, island, operator (1 = At least), unknown(2), percent | Player has building with a productivity? |
| 1035      | player, (0 = Less / 2 = More), number, GUID | Player has more/less buildings of type worldwide |
| 1502      | unknown(4)  | Oil spill event has reached coast? |
| 1503      | player, island, 1, 2, value | Energy value greater than value? |
| 1504      | objects   | Is any of the objects affected by EMP? |