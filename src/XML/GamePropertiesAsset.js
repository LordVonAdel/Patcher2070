import XMLAsset from "../Common/XMLAsset.js";
import BuildMenu from "../Common/BuildMenu.js";

/**
 * "WarehouseGoodsSettings" determines which item is on what page in the warehouse.
 */

export default class GamePropertiesAsset extends XMLAsset {

  constructor() {
    super();

    /**
     * @private
     * @type {BuildMenu}
     */
    this.buildmenu = null;
  }

  /**
   * @returns {BuildMenu}
   */
  getBuildmenu() {
    if (this.buildmenu) return this.buildmenu;

    const buildMenuXML = this.xml.findChild("Properties")
      .findChild("Groups")
      .getChildrenOfType("Group")
      .find(group => group.getInlineContent("name") == "Balancing")
      .findChild("DefaultValues")
      .findChild("GUIBalancing")
      .findChild("BuildmenuFrame");
      
    this.buildmenu = new BuildMenu(buildMenuXML);
    return this.buildmenu;
  }

  /**
   * @param {string} productName
   * @returns {string} Icon GUID
   */
  getIconGUIDOfProduct(productName) {
    // /Properties/Groups/Group[5]/DefaultValues/GUIBalancing/ProductIconGUID
    const productIcons = this.xml.findChild("Properties")
      .findChild("Groups")
      .getChildrenOfType("Group")
      .find(group => group.getInlineContent("name") == "Balancing")
      .findChild("DefaultValues")
      .findChild("GUIBalancing")
      .findChild("ProductIconGUID");

    // Try to search in assets if this is an addon product
    return productIcons.findChild(productName)?.getInlineContent("icon");
  }
}
