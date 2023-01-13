import GameInterface from "./GameInterface.js";
import RDMAsset from "../RDM/RDMAsset.js";

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
    const file = await this.api.getGameFile(filepath);
    asset.readData(file);
    return asset;
  }
}