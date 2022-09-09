import Path from 'path';
import fs from 'fs';
import RDAAsset from "../RDA/RDAAsset.js";
import Assets from "../XML/Assets.js";
import Items from "../XML/Items.js";
import ProductsAPI from './ProductsAPI.js';
import PlayerProfileAPI from './PlayerProfileAPI.js';
import ShaderAPI from './ShaderAPI.js';
import DatasetsAsset from './../XML/DatasetsAsset.js';
import EngineIni from '../XML/EngineIni.js';
import StringAPI from './StringAPI.js';
import IconsAPI from './IconsAPI.js';
import LevelAPI from "./LevelAPI.js";
import GamePropertiesAsset from '../XML/GamePropertiesAsset.js';

export default class GameInterface {

  /**
   * @param {string} gameDirectory Installation directory of Anno 2070
   */
  constructor(gameDirectory) {
    /**
     * @private
     * @type {string}
     */
    this.gameDirectory = gameDirectory;

    /**
     * @private
     * @type {Object<string, FileIndex>}
     */
    this.fileIndex = {};

    /**
     * @private
     */
    this.failedRDAs = [];

    /**
     * @type {ProductsAPI}
     */
    this.productsAPI = new ProductsAPI(this);

    /**
     * @type {PlayerProfileAPI}
     */
    this.playerProfileAPI = new PlayerProfileAPI(this);

    /**
     * @type {ShaderAPI}
     */
    this.shaderAPI = new ShaderAPI(this);

    /**
     * @type {StringAPI}
     */
    this.stringAPI = new StringAPI(this); 

    /**
     * @type {IconsAPI}
     */
    this.iconsAPI = new IconsAPI(this);

    /**
     * @type {LevelAPI}
     */
    this.levelAPI = new LevelAPI(this);

    /**
     * @private
     */
    this.assets = null;

    /**
     * @private
     */
    this.datasets = null;

    /**
     * @private
     */
    this.items = null;

    /**
     * @private
     */
    this.engineIni = null;

    /**
     * @private
     */
    this.properties = null;

    this.isAddonInstalled = true;

    /**
     * @type {LangID}
     */
    this.installedLanguage = null;
  }

  async init() {
    await this.checkGameDirectory();
    await this.buildFileIndex();

    const engineIni = await this.getEngineIni();
    this.installedLanguage = engineIni.getValue("LanguageTAG");
    if (!this.installedLanguage) throw new Error("Can't detect installed language!");
  }

  async checkGameDirectory() {
    const exePath = Path.join(this.gameDirectory, "Anno5.exe");
    try {
      await fs.promises.stat(exePath);
    } catch (e) {
      throw new Error("Game directory does not contain Anno 2070.");
    }
    return true;
  }

  async buildFileIndex() {
    const maindataDirectory = Path.join(this.gameDirectory, "maindata");
    const rdaFiles = (await fs.promises.readdir(maindataDirectory)).filter(filename => filename.endsWith(".rda"));

    for (let i in rdaFiles) {
      rdaFiles[i] = await this.backupSystemFile(Path.join(maindataDirectory, rdaFiles[i]));
    }

    const baseFiles = rdaFiles.filter(filename => !filename.includes("patch"));
    const patchFiles = rdaFiles.filter(filename => filename.includes("patch")).sort();

    // Move patch files to end, so they override base files.
    baseFiles.push(...patchFiles);
    for (let filepath of baseFiles) {      
      const rda = new RDAAsset();

      try {
        await rda.readFile(filepath);
      } catch (e) {
        this.failedRDAs.push({
          filepath: filepath, error: e
        });
        continue;
      }

      const rdaIndex = rda.getIndex();
      for (let packedFile of rdaIndex) {
        this.fileIndex[packedFile] = new FileIndex(packedFile, filepath.replace(".backup", ""));
      }
    }

    this.isAddonInstalled = baseFiles.some(filename => filename.includes("addon0.rda"));
  }

  doesFileExist(filepath) {
    return filepath in this.fileIndex;
  }

  async getGameFile(filepath) {
    if (!this.doesFileExist(filepath)) {
      throw new Error(`File ${filepath} not found in game.`);
    }
    const fileIndex = this.fileIndex[filepath];
    return await fileIndex.getContent();
  }

  /**
   * Sometimes file names are given with other extensions in some files... 
   * @param {string} filepath 
   * @returns {string|null}
   */
  findTextureFile(filepath) {
    if (this.doesFileExist(filepath)) return filepath;
    const base = filepath.substring(0, filepath.lastIndexOf("."));
    const variations = [
      base + ".png",
      base + ".dds",
      base + "_0.png",
      base + "_0.dds"
    ];
    for (let variation of variations) {
      if (this.doesFileExist(variation)) return variation;
    }
    return null;
  }

  async findGameFile(callback) {
    for (let k in this.fileIndex) {
      if (callback(this.fileIndex[k])) return this.fileIndex[k];
    }
    return null;
  }

  async getDatasets() {
    if (this.datasets) return this.datasets;

    const file = await this.getGameFile("data/config/game/datasets.xml");
    if (!file) throw new Error("No datasets file found!");
    this.datasets = new DatasetsAsset();
    this.datasets.readData(file);
    return this.datasets;
  }

  async getAssets() {
    if (this.assets) return this.assets;

    const mainFile = await this.getGameFile("data/config/game/assets.xml");
    if (!mainFile) throw new Error("No assets file found!");
    this.assets = new Assets();
    this.assets.readData(mainFile);

    if (this.isAddonInstalled) {
      const addonFile = await this.getGameFile("addondata/config/balancing/addon_01_assets.xml");
      const addonAssets = new Assets();
      addonAssets.readData(addonFile);
      this.assets.merge(addonAssets);
    }

    return this.assets;
  }

  async getItems() {
    if (this.items) return this.items;

    const file = await this.getGameFile("data/config/features/items.xml");
    if (!file) throw new Error("No items file found!");
    this.items = new Items();
    this.items.readData(file);
    return this.items;
  }

  async getEngineIni() {
    if (this.engineIni) return this.engineIni;

    const path = EngineIni.GetDefaultFilePath();
    this.engineIni = new EngineIni();
    await this.engineIni.readFile(path);
    return this.engineIni;
  }

  async getProperties() {
    if (this.properties) return this.properties;

    const file = await this.getGameFile("data/config/game/properties.xml");
    if (!file) throw new Error("No Properties file found!");
    this.properties = new GamePropertiesAsset();
    this.properties.readData(file);
    return this.properties;
  }

  /**
   * Applies all files marked as modified to the game. 
   * Warning: This function modifies installation files of the game!
   */
  async patch() {
    if (this.assets) {
      this.fileIndex["data/config/game/assets.xml"].updateContent(this.assets.writeData());
    }
    
    if (this.properties) {
      this.fileIndex["data/config/game/properties.xml"].updateContent(this.properties.writeData());
    }

    if (this.engineIni) {
      this.engineIni.writeToFile(EngineIni.GetDefaultFilePath());
    }

    const modifiedRDAs = {};
    for (let k in this.fileIndex) {
      const file = this.fileIndex[k];
      if (!file.isModified) continue; 
      
      if (file.rda in modifiedRDAs) {
        modifiedRDAs[file.rda].push(file);
      } else {
        modifiedRDAs[file.rda] = [file];
      }
    }

    for (let rdaPath in modifiedRDAs) {
      const rda = new RDAAsset();
      await rda.readFile(rdaPath + ".backup");
      for (let file of modifiedRDAs[rdaPath]) {
        rda.updateFile(file.filepath, file.content);
      }
      await rda.writeToFile(rdaPath);
    }

    this.shaderAPI.resetCache();
  }

  /**
   * Creates a backup copy of a file on the system and stores it in the same directory
   * @param {string} path Path to the file
   * @returns 
   */
  async backupSystemFile(path) {
    const backupPath = path + ".backup";
    // Only backup if backup file does not exist
    await fs.promises.stat(backupPath).catch(() => {
      return fs.promises.copyFile(path, backupPath);
    });
    return backupPath;
  }

  /**
   * Replaces a file on the file system with a backup file if one exists
   * @param {string} path Path to the file. (File to restore. Not the backup!)
   */
  async restoreSystemFile(path) {
    const backupPath = path + ".backup";
    await fs.promises.copyFile(backupPath, path);
    return path;
  }

  /**
   * Sets the content of a maindata file
   * @param {Buffer} content content of the file
   * @param {string} gamePath path inside RDA
   */
  async updateFile(content, gamePath) {
    if (!(gamePath in this.fileIndex)) {
      this.fileIndex[gamePath] = new FileIndex(gamePath, null);
    }
    this.fileIndex[gamePath].updateContent(content);
  }

  /**
   * Replaces a game file with one from the hosts file system
   * @param {string} systemPath filepath on the host system
   * @param {string} gamePath path inside RDA
   */
  async replaceFile(systemPath, gamePath) {
    const content = await fs.promises.readFile(systemPath);
    this.updateFile(content, gamePath);
  }

  async getFileIndex() {
    return this.fileIndex;
  }

  async getAllLanguageStrings() {
    let out = "";
    for (let k in this.fileIndex) {
      if (k.endsWith(".txt")) {
        const content = (await this.getGameFile(k)).toString("UTF-16LE");
        out += "\n ####### " + k + " #######\n" + content;
      }
    }
    return out;
  }

  async patchEXE() {
    // Removed because of 64 bit update of the game from 2022-09-07
  }

  /**
   * Reverts all changes done by the patcher. (Except changes to Engine.ini)
   */
  async unpatch() {
    const patch8Path = Path.join(this.gameDirectory, "maindata", "patch8.rda");
    await this.restoreSystemFile(patch8Path);
    this.shaderAPI.resetCache();
  }

  async loadMod(path) {
    const mod = await import("File:\\" + path);
    await mod.default.run(this);
  }
}

class FileIndex {
  constructor(filepath, rda) {
    this.filepath = filepath;
    this.rda = rda;
    this.content = null;
    this.isModified = false;
  }

  async getContent() {
    if (this.content) {
      return this.content;
    }

    const rdaAsset = new RDAAsset();
    await rdaAsset.readFile(this.rda);    
    this.content = rdaAsset.extractFile(this.filepath);
    return this.content;
    return rdaAsset.extractFile(this.filepath);
  }

  /**
   * @param {Buffer} content 
   */
  updateContent(content) {
    this.isModified = true;
    this.content = content;
  }
}
