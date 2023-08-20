import XMLParser from "../Common/XMLParser.js";
import { XMLElement } from "../Common/XMLParser.js";
import DDSAsset from "../DDS/DDSAsset.js";
import ISDAsset from "../XML/ISDAsset.js";
import WWWAsset from "../XML/WWWAsset.js";
import GameInterface from "./GameInterface.js";

/**
 * Used for everything level related. Islands and worlds.
 */

export default class LevelAPI {

  #api;

  /**
   * @param {GameInterface} api 
   */
  constructor(api) {
    this.#api = api;
  }

  /**
   * @param {string} Filepath
   * @returns {WWWAsset}
   */
  async getWorldData(filepath) {
    const asset = new WWWAsset();
    const file = await this.#api.getGameFile(filepath);
    asset.readData(file);
    return asset;
  }

  /**
   * @param {string} Filepath
   * @returns {ISDAsset}
   */
  async getIslandData(filepath) {
    const asset = new ISDAsset();
    const file = await this.#api.getGameFile(filepath);
    asset.readData(file);
    return asset;
  }

  /**
   * Adds a new ground texture to the game that can be used on islands.
   * @param {string} name Name of the texture to add. This is used for the file names of the textures.
   * @param {string} diffuseTexture Path to the diffuse texture on the system.
   * @param {string} normalTexture Path to the normal texture on the system. Format is RG for XY. It is unknown what B and A does, but A seems to be used in almost all default textures.
   * @returns {Number} GUID of the added texture. Use this to set the texture on an island.
   */
  async addGroundTexture(name, diffuseTexture, normalTexture = null) {
    const texturesFile = await this.#api.getGameFile("data/config/engine/groundtextures.xml");
    const groundTexturesFile = XMLParser.parse(texturesFile);
    const groundTextures = groundTexturesFile.findChild("GroundTextures");
    const textures = groundTextures.getChildrenOfType("Texture");
    const splatID = textures.reduce((acc, curr) => Math.max(+curr.getInlineContent("SplatID"), acc), 0) + 10;

    // In the original game, often the file ending is .png in the XML, but the actual file is .dds
    const diffuseGamePath = `data\\graphics\\landscape\\terrain\\${name}_diff.dds`;
    const normalGamePath = `data\\graphics\\landscape\\terrain\\${name}_norm.dds`;

    // Just count up the latest GUID from groundtextures. This may result in an overlap if too many ground textures are added.
    // It is unknown if this overlap results in any issues. Getting free GUIDs from strings are too high and result in the texture not being shown in game.
    const guid = textures.reduce((acc, curr) => Math.max(+curr.getInlineContent("GUID"), acc), 0) + 1;

    const xml = new XMLElement("Texture");
    xml.setInlineContent(guid, "GUID");
    xml.setInlineContent(name, "Name");
    xml.setInlineContent(0, "ShallowCoast");
    xml.setInlineContent(splatID, "SplatID");

    xml.setInlineContent(diffuseGamePath, "DiffuseTexture");
    await this.#api.replaceFile(diffuseTexture, diffuseGamePath.replace(/\\/g, "/"));

    if (normalTexture) {
      xml.setInlineContent(normalGamePath, "NormalTexture");
      await this.#api.replaceFile(normalTexture, normalGamePath.replace(/\\/g, "/"));
    } else {
      xml.setInlineContent("data\\graphics\\landscape\\terrain\\wiki_dummy_norm.png", "NormalTexture");
    }

    /**
     * Unimplemented attributes:
     * "MappingProfile" Maybe something about projection?
     * "MapToGUID"      Sides when using box projection?
     * "GrassMesh"      If set, no texture is used
     * "GrassTexture"   If set, no texture is used
     * "GrassFadeIn"    Always 1000 if used
     */

    // Seems to be white for all textures in the base game
    const meanColor = new XMLElement("MeanColor");
    meanColor.setInlineContent(255, "R");
    meanColor.setInlineContent(255, "G");
    meanColor.setInlineContent(255, "B");
    xml.addChild(meanColor);

    groundTextures.addChild(xml);

    await this.#api.updateFile(groundTexturesFile.toBuffer(), "data/config/engine/groundtextures.xml");

    return guid;
  }

  createIsland() {
    return new ISDAsset();
  }

  createWorld() {
    return new WWWAsset();
  }

  /**
   * Adds .www and other files via gameinterface. Including aiprofiles, assets, features, quests and texts
   * @param {WWWAsset} wwwAsset
   * @param {string} filepath Filepath without extension. ".www" is added automatically
   */
  async registerWorld(wwwAsset, filepath) {
    filepath = filepath.replace(/\\/g, "/");
    await this.#api.updateFile(wwwAsset.writeData(), filepath + ".www");
    await this.#api.updateFile("<Group><ToolOneVersion>7</ToolOneVersion></Group>", filepath + "_aiprofiles.xml");
    await this.#api.updateFile("<Group><ToolOneVersion>7</ToolOneVersion></Group>", filepath + "_assets.xml");
    await this.#api.updateFile("<Group><ToolOneVersion>7</ToolOneVersion></Group>", filepath + "_features.xml");
    await this.#api.updateFile("<Group><ToolOneVersion>7</ToolOneVersion></Group>", filepath + "_quests.xml");
    await this.#api.updateFile("<Group><ToolOneVersion>7</ToolOneVersion></Group>", filepath + "_texts.xml");
    await this.#api.updateFile(await this.#api.getGameFile("data/levels/scenarios/singleplayer/01.png"), filepath + ".png");
  }
}