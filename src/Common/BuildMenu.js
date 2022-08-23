export default class BuildMenu {

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
        tooltipNormalGUID:   10000000 + Number(buildingItem.getInlineContent("BuildingButtonTooltip")),
        tooltipDisabledGUID: 20000000 + Number(buildingItem.getInlineContent("BuildingButtonTooltip")),
        tooltipPressedGUID:  30000000 + Number(buildingItem.getInlineContent("BuildingButtonTooltip")),
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
