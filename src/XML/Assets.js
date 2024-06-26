import AssetsAsset, { Asset } from "../Common/AssetsAsset.js";
import BuildMenu from "../Common/BuildMenu.js";

export default class Assets extends AssetsAsset{
  constructor() {
    super();

    /**
     * @private
     * @type {BuildMenu}
     */
    this.buildmenu = null;
  }

  /**
   * @returns {Asset[]} Buildings defined in this file
   */
  getAllBuildings() {
    return this.getAllByTemplate("building");
  }

  /**
   * @returns {Asset[]} Missions defined in this file
   */
  getAllMissions() {
    return this.getAllByTemplate("mission");
  }

  getAllByTemplate(template) {
    const temp = template.toLowerCase();
    const assets = this.getAllAssets();
    return assets.filter(asset => asset.Template?.toLowerCase().includes(temp));
  }

  /**
   * @returns {BuildMenu}
   * @throws Error when addon is not merged into assets
   */
  getBuildmenu() {
    if (this.buildmenu) return this.buildmenu;

    const asset = this.getAssetByGUID("40000000"); // AddonBalancing
    if (!asset) {
      throw new Error("Addon is not merged into Assets file. Get the build menu from GameProperties Instead!");
    }

    const buildMenuXML = asset.values.findChild("GUIBalancing").findChild("BuildmenuFrame");
    this.buildmenu = new BuildMenu(buildMenuXML);
    return this.buildmenu;
  }

  /**
   * @param {string} productName
   * @returns {string} Icon GUID
   */
  getIconGUIDOfProduct(productName) {
    const asset = this.getAssetByGUID("40000000"); // AddonBalancing
    if (!asset) {
      throw new Error("Addon is not merged into Assets file. Get the icons from GameProperties Instead!");
    }

    const productIcons = asset.values.findChild("GUIBalancing").findChild("ProductIconGUID");
    return productIcons.findChild(productName)?.getInlineContent("icon");
  }

}
