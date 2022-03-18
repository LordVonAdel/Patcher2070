import AssetsAsset, { Asset } from "../Common/AssetsAsset.js";

export default class Assets extends AssetsAsset{
  constructor() {
    super();
  }

  /**
   * @returns {Asset[]} Buildings defined in this file
   */
  getAllBuildings() {
    const objectsGroup = this.groups.find(g => g.name == "Objects").getSubgroup("Buildings");
    return objectsGroup.getAssets(true);
  }
}
