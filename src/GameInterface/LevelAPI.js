import ISDAsset from "../XML/ISDAsset.js";
import WWWAsset from "../XML/WWWAsset.js";
import GameInterface from "./GameInterface.js";

export default class IconsAPI {

  /**
   * @param {GameInterface} api 
   */
  constructor(api) {
    /**
     * @private
     */
    this.api = api;
  }

  /**
   * @param {string} Filepath
   * @returns {WWWAsset}
   */
  async getWorldData(filepath) {
    const asset = new WWWAsset();
    const file = await this.api.getGameFile(filepath);
    asset.readData(file);
    return asset;
  }

  /**
   * @param {string} Filepath
   * @returns {ISDAsset}
   */
  async getIslandData(filepath) {
    const asset = new ISDAsset();
    const file = await this.api.getGameFile(filepath);
    asset.readData(file);
    return asset;
  }
}