import XMLAsset from "../Common/XMLAsset.js";

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

    return productIcons.findChild(productName).getInlineContent("icon");
  }
}

class BuildMenu {

  constructor(xml) {
    /**
     * @private
     */
    this.xml = xml;

    /**
     * @private
     */
    this.factionMenus = {};
  }

  /**
   * @param {Faction} faction 
   * @returns {BuildMenuFaction}
   */
  getFactionMenu(faction) {
    if (faction in this.factionMenus) return this.factionMenus[faction];
    const factionXML = this.xml.findChild("BuildingFaction").findChild(faction);
    this.factionMenus[faction] = new BuildMenuFaction(factionXML, faction);
    return this.factionMenus[faction];
  }

  /**
   * @returns {BuildMenuEntry[]}
   */
  getAllBuildingEntries() {
    let entries = [
      ...this.getFactionMenu("Eco").getAllBuildingEntries(),
      ...this.getFactionMenu("Tycoon").getAllBuildingEntries(),
      ...this.getFactionMenu("Tech").getAllBuildingEntries(),
      ...this.getAllProductionEntries()
    ];

    // Make entries unique. (Buildings multiple faction have access to are listed multiple times).
    // Filter by tooltip instead of BuildingGUID, to keep doubles between production and faction level
    entries = entries.filter((entry, index, self) => self.findIndex(e => e.tooltipNormalGUID == entry.tooltipNormalGUID) == index);

    return entries;
  }

  /**
   * @returns {BuildMenuEntry[]}
   */
  getAllProductionEntries() {
    const out = [];
    
    const productionChainEntries = this.xml.findChild("ProductionChainBuildingSettings").getChildrenOfType("Item");
    for (let buildingItem of productionChainEntries) {
      out.push({
        buildingGUID: buildingItem.getInlineContent("buildingGUID"),
        tooltipNormalGUID: "1" + buildingItem.getInlineContent("BuildingButtonTooltip"),
        tooltipDisabledGUID: "2" + buildingItem.getInlineContent("BuildingButtonTooltip"),
        tooltipPressedGUID: "3" + buildingItem.getInlineContent("BuildingButtonTooltip"),
        hasSubitems: false
      });
    }

    return out;
  }
}

class BuildMenuFaction {
  constructor(xml, faction) {
    /**
     * @private
     */
    this.xml = xml;

    /**
     * @private
     */
    this.faction = faction;
  }

  /**
   * @returns {BuildMenuEntry[]}
   */
  getAllBuildingEntries() {
    const out = [];
    const levels = this.xml.findChild("BuildingConstructionSettings");
    for (let level of levels.content) {
      const info = level.findChild("GroupInfo")
      if (!info) continue;
      const groups = info.content;
      for (let group of groups) {
        const buildings = group.findChild("Buildings").getChildrenOfType("Item");
        for (let building of buildings) {
          out.push({
            faction: this.faction,
            level: level.name,
            group: group.name,
            buildingGUID: building.getInlineContent("buildingGUID"),
            tooltipNormalGUID: "1"+building.getInlineContent("buildButtonTooltip"),
            tooltipDisabledGUID: "2"+building.getInlineContent("buildButtonTooltip"),
            tooltipPressedGUID: "3"+building.getInlineContent("buildButtonTooltip"),
            hasSubitems: building.findChild("Tier1") !== null
          });
        }
      }
    }
    return out;
  }
}

/**
 * @typedef {Object} BuildMenuEntry
 * @property {string} buildingGUID
 * @property {Faction} [faction]
 * @property {BuildingMenuLevel} [level]
 * @property {BuildMenuGroup} [group]
 * @property {string} tooltipNormalGUID
 * @property {string} tooltipDisabledGUID
 * @property {string} tooltipPressedGUID
 * @property {boolean} hasSubitems
 */

/**
 * @typedef {"Others"|"Level1"|"Level2"|"Level3"|"Level4"|"Ornamental"} BuildingMenuLevel
 */

/**
 * @typedef {"Production"|"Special"|"Infrastructure"|"Public"|"DisasterControl"|"Harbour"|"Ornamental1"|"Ornamental2"|"Ornamental3"} BuildMenuGroup
 */

/**
 * @typedef {"Eco"|"Tycoon"|"Tech"} Faction
 */