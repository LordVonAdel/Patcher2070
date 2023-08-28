import GameInterface from "./GameInterface.js";
import { XMLElement } from "../Common/XMLParser.js";

/**
 * Missions in main menu are hardcoded by GUID. References are in main_menu_mission_overview.dlg.
 * GUIDs of scenarios and missions are present in the exe file in the function at address: 0x140366f20. 
 * It is unlikely to be possible to add additional scenarios without modifying the exe file.
 */

/**
 * Because we can't add additional scenarios, we can only overwrite existing ones at the moment.
 */
const OverwriteIDS = [
  3261000, // Scenario 01, Single Player
  3261500, // Scenario 02, Single Player
  3265000, // Scenario 03, Single Player
  3262500, // Scenario 04, Single Player
  3263000, // Scenario 05, Single Player
  3263500, // Scenario 06, Single Player
  3266000, // Scenario 07, Single Player
  3267000, // Scenario 08, Single Player
];

export default class MissionAPI {
  
  /**
   * @type {GameInterface}
   */
  #api;

  constructor(api) {
    this.#api = api;
  }

  async createMission() {
    const assets = await this.#api.getAssets();

    if (OverwriteIDS.length == 0) throw new Error("No more missions to overwrite.");
    const guid = OverwriteIDS.shift();

    assets.removeAssetByGUID(guid);

    const missionAsset = assets.createAsset(
      "Mission" + guid,
      assets.getGroup("-MetaGame.Missions.Scenario.SinglePlayer")
    );

    missionAsset.Template = "ScenarioMission";
    missionAsset.Standard.GUID = guid;

    const mission = new Mission(missionAsset);
    mission.generate();
    return mission;
  }
}

export class Mission {
  
  /**
   * @type {XMLElement}
   */
  #xml;
  #values;

  constructor(asset) {
    this.#xml = asset.xml;
    this.#values = this.#xml.findChild("Values");
  }

  get GUID() {
    return this.#values.findChild("Standard").getInlineContent("GUID");
  }

  /**
   * @param {""|"Medium"|"Hard"} value
   */
  set difficulty(value) {
    this.#values.findChild("Mission").setInlineContent(value, "Difficulty");
  }

  generate() {
    this.#values = this.#xml.findChild("Values", 0, true);

    const mission = this.#values.createChildTag("Mission");
    mission.setInlineContent(2048, "WorldMapCoordX");
    mission.setInlineContent(1024, "WorldMapCoordY");
    this.#values.addChild(new XMLElement("MissionBriefing"));
    const gameSettings = this.#values.createChildTag("GameSettings");
    gameSettings.createChildTag("GameWorld");
    const charList = gameSettings.createChildTag("CharacterList");
    this.#values.addChild(new XMLElement("ScenarioCutscenes"));
    this.#values.addChild(new XMLElement("Reward"));

    // Human player
    const item = charList.createChildTag("Item");
    item.setInlineContent(1, "IsHuman");
  }

  setShortDescription(guid) {
    this.#values.findChild("Mission").setInlineContent(guid, "ShortDescription");
  }

  setBriefingText(guid) {
    this.#values.findChild("MissionBriefing").findChild("Briefing", 0, true).setInlineContent(guid, "Text");
  }

  /**
   * @param {string} path Path to bkg file
   */
  setPicture(path) {
    if (!path.endsWith(".bkg")) throw new Error("Path does not end with .bkg");
    path = path.replace(/\\/g, "/");
    this.#values.findChild("MissionBriefing", 0, true).setInlineContent(path, "PictureFile");
    this.#values.findChild("Mission", 0, true).setInlineContent(path, "VideoFile");
  }

  /**
   * @param {string} level Path to level file. (Ends with www)
   */
  setLevel(level) {
    if (!level.endsWith(".www")) throw new Error("Path does not end with .www");
    this.#values.findChild("GameSettings").setInlineContent(level.replace(/\//g, "\\"), "LevelFile");
  }

  /**
   * @param {StartConditions} conditions 
   */
  setStartConditions(conditions) {
    const element = this.#values.findChild("GameSettings").findChild("StartConditions", 0, true);
    for (const key in conditions) {
      element.setInlineContent(conditions[key], key);
    }
  }

  /**
   * @param {GameWorld} world 
   */
    setGameWorld(world) {
      const element = this.#values.findChild("GameSettings").findChild("GameWorld", 0, true);
      for (const key in world) {
        element.setInlineContent(world[key], key);
      }
    }

  /**
   * Adds a character to the mission
   * @param {Number} guid 
   * @param {Number} playerId 
   * @param {"Easy"|"Medium"|"Hard"} difficulty 
   */
  addCharacter(guid, playerId, difficulty = "Medium") {
    const charList = this.#values.findChild("GameSettings").findChild("CharacterList");
    const item = charList.createChildTag("Item");
    item.setInlineContent(guid, "CharacterGUID");
    item.setInlineContent(playerId, "PlayerID");
    item.setInlineContent(difficulty, "Difficulty");
  }

}

/**
 * @typedef {Object} StartConditions
 * @property {"Spare"|"Medium"|"Plenty"|"VeryMuch"} [Credit]
 * @property {"None"|"Few"|"Plenty"} [Manpower]
 * @property {"Off"|"Standard"|"Double"|"Tripple"} [WithWarehouse]
 * @property {"AtStartIsland"|"UsePlayerArkSlot"|"NoArk"} [PlayerArk]
 * @property {"Off"|"Standard"|"Support"|"Armada"} [Fleet]
 * @property {0|1} [DiscoveredMap]
 * @property {Number} [PlayerArkSlot]
 * @property {String} [StartWithIntermediatelevels] Semicolon separated list of IntermediateLevel
 * @property {Number} [PlayerArkGUID]
 */

/**
 * @typedef {Object} GameWorld
 * @property {"Half"|"Full"} [CostRefund]
 * @property {"Off"|"Sometimes"|"Standard"|"Often"} [QuestFrequency]
 */