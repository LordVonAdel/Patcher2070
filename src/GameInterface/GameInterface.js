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
  }

  async init() {
    await this.checkGameDirectory();
    await this.buildFileIndex();
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
    const rdaFiles = (await fs.promises.readdir(Path.join(this.gameDirectory, "maindata")))
      .filter(filename => filename.endsWith(".rda"));

    const baseFiles = rdaFiles.filter(filename => !filename.startsWith("patch"));
    const patchFiles = rdaFiles.filter(filename => filename.startsWith("patch")).sort();
 
    // Read from prepatch if available to prevent double reads
    const patchedPath = Path.join(this.gameDirectory, "maindata", "patch8.rda.prepatch");
    const stat = await fs.promises.stat(patchedPath).catch(() => {});
    if (stat) {
      patchFiles.pop(); // Remove modded patch 8
      patchFiles.push(patchedPath); // Add original patch 8
    }

    // Move patch files to end, so they override base files.
    baseFiles.push(...patchFiles);
    for (let file of baseFiles) {
      const filepath = Path.join(this.gameDirectory, "maindata", file);
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
        this.fileIndex[packedFile] = new FileIndex(packedFile, filepath);
      }
    }
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
    const patch8Path = Path.join(this.gameDirectory, "maindata", "patch8.rda");

    // Backup patch8.rda
    await fs.promises.stat(patch8Path + ".prepatch").catch(() => {
      return fs.promises.copyFile(patch8Path, patch8Path + ".prepatch");
    });

    const baseRDA = new RDAAsset();
    await baseRDA.readFile(Path.join(this.gameDirectory, "maindata", "patch8.rda.prepatch"));

    const modifiedFiles = [];

    if (this.assets) {
      this.fileIndex["data/config/game/assets.xml"].updateContent(this.assets.writeData());
    }
    
    if (this.properties) {
      this.fileIndex["data/config/game/properties.xml"].updateContent(this.properties.writeData());
    }

    if (this.engineIni) {
      this.engineIni.writeToFile(EngineIni.GetDefaultFilePath());
    }

    for (let k in this.fileIndex) {
      if (this.fileIndex[k].isModified) modifiedFiles.push(this.fileIndex[k]);
    }

    for (let file of modifiedFiles) {
      baseRDA.updateFile(file.filepath, file.content);
    }

    await baseRDA.writeToFile(patch8Path);

    //this.shaderAPI.resetCache();
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
    // Backup EXE
    const exePath = Path.join(this.gameDirectory, "Anno5.exe");
    await fs.promises.stat(exePath + ".prepatch").catch(() => {
      return fs.promises.copyFile(exePath, exePath + ".prepatch");
    });

    const exeContent = await fs.promises.readFile(Path.join(this.gameDirectory, "Anno5.exe.prepatch"));

    function replace(search, replace) {
      if (search.length != replace.length) throw new Error("Search and length section need to be same size!");

      const indexA = exeContent.indexOf(search);
      const indexB = exeContent.indexOf(search, indexA + 1);
      if (indexB != -1) throw new Error("Search chunk occours multiple times!");
      replace.copy(exeContent, indexA, 0, replace.length);
    }

    // Enable Patch 9
    replace(  // Increase itteration count in PatchX loading loop
      Buffer.from([0x83, 0xff, 0x09, 0x0f, 0x8c, 0x3f, 0xff, 0xff, 0xff]),
      Buffer.from([0x83, 0xff, 0x0A, 0x0f, 0x8c, 0x3f, 0xff, 0xff, 0xff])
    );

    // Replace related design news server with my own. They still advertise anno-online 5 years after it shut down.
    replace(
      Buffer.from("news.related-designs.de", "utf16le"),
      Buffer.from("anpatcher2070.atoria.de", "utf16le")
    );

    // Disable Autopatcher
    replace( // JZ to JNZ
      Buffer.from([0x84, 0xdb, 0x0f, 0x84, 0xad, 0x00, 0x00, 0x00, 0x68, 0x24, 0xbe]),
      Buffer.from([0x84, 0xdb, 0x0f, 0x85, 0xad, 0x00, 0x00, 0x00, 0x68, 0x24, 0xbe])
    );

    await fs.promises.writeFile(exePath, exeContent);
  }

  /**
   * Reverts all changes done by the patcher. (Except changes to Engine.ini)
   */
  async unpatch() {
    const exePath = Path.join(this.gameDirectory, "Anno5.exe");
    const patch8Path = Path.join(this.gameDirectory, "maindata", "patch8.rda");

    await fs.promises.copyFile(patch8Path + ".prepatch", patch8Path);
    await fs.promises.copyFile(exePath + ".prepatch", exePath);
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
