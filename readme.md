# Unofficial Anno 2070 Mod SDK

The idea is to have an api that modifies existing game files without completely replacing them. All modifications possible should be done via the api to ensure compatibility to other mods. 
Another positive point is that it is not necessary to distribute original game files.

## Features
What the API can do at the moment:
- Extract game files from .rda archives
- Replace/Add any game file inside an .rda archive
- Add player colors
- Add/Change strings supporting multiple languages
- Change/Remove assets (Buildings, Vehicles, etc.)
- Extract icons as single files
- Add/Change style classes for tooltips
- Change values in Engine.ini
- Read the structure of the build menu
- Detect if the addon is installed
- Add ground textures for terrain on islands
- Parse/Write ABO and ABL files
- Add missions
- Add worlds
- Add/Change islands
- Add Ark skins

What it can't do at the moment:
- Add products (wares)
- Add/change/remove items
- Add assets (buildings, vehicles, etc.)
- Add/Change/Remove quests
- Add/Change 3d Models
- Change the structure of the build menu
- Change UI Layouts