import GameInterface from "./GameInterface.js";
import RDMAsset from "../RDM/RDMAsset.js";
import CFGAsset from "../XML/CFGAsset.js";

export default class ModelAPI {

  constructor(api) {

    /**
     * @property {GameInterface} api
     */
    this.api = api;
  }

  /**
   * @param {string} Filepath
   * @returns {RDMAsset}
   */
   async getModelData(filepath) {
    const asset = new RDMAsset();
    asset.dataFilePath = filepath;
    const file = await this.api.getGameFile(filepath);
    asset.readData(file);
    return asset;
  }

  async getCFG(filepath) {
    const asset = new CFGAsset();
    asset.dataFilePath = filepath;
    const file = await this.api.getGameFile(filepath);
    asset.readData(file);
    return asset;
  }
}