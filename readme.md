# Unofficial Anno 2070 Mod SDK

The idea is to have an api that modifies existing game files without completely replacing them. All modifications possible should be done via the api to ensure compatibility to other mods. 
Another positive point is that it is not needed to distribute original game files.

## Features
What the API can do at the moment:
- Extract game files from .rda archives
- Replace/Add any game file inside an .rda archive
- Add player colors
- Add/Change strings supporting multiple languages
- Change assets (Buildings, Vehicles, etc.)
- Extract icons as single files
- Add/Change style classes for tooltips
- Change values in Engine.ini
- Read the structure of the build menu
- Detect if the addon is installed
- Read terrain data of islands
- Parse/Write ABO and ABL files

What it can't do at the moment:
- Add products (wares)
- Add/change/remove items
- Add/remove assets (buildings, vehicles, etc.)
- Add/Change/Remove islands
- Add/Change/Remove missions
- Add/Change/Remove quests
- Add/Change/Remove maps
- Add/Change 3d Models
- Change the structure of the build menu
- Change UI Layouts