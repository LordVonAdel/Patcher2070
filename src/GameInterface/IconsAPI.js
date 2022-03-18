import GameInterface from "./GameInterface.js";
import XMLParser from "../Common/XMLParser.js";
import DDSAsset from "../DDS/DDSAsset.js";

export default class IconsAPI {

  /**
   * @param {GameInterface} api 
   */
  constructor(api) {
    /**
     * @private
     */
    this.api = api;

    /**
     * @private
     */
    this.iconsIndex = null;

    /**
     * @private
     */
    this.iconTextures = null;;
  }

  /**
   * @param {string} iconId 
   * @param {number} [variation]
   * @returns {DDSAsset}
   */
  async getIcon(iconId, variation = 0) {
    if (!this.iconsIndex) await this.loadIconIndex();

    const index = this.iconsIndex.find(icon => icon.guid == iconId && variation == icon.variation);
    if (!index) throw new Error("Icon does not exist!");

    const texture = index.texture;
    if(!texture) throw new Error("Icon texture does not exist!");
    if (!texture.isGameIcon) throw new Error("Icon is not a game icon");

    if (!texture.dds) {
      texture.dds = new DDSAsset();
      texture.dds.readData(await this.api.getGameFile(texture.filename));
    }

    const iconsW = Math.floor(texture.dds.width / texture.IconWidth);
    const iconX = (index.iconIndex % iconsW) * texture.IconWidth;
    const iconY = Math.floor(index.iconIndex / iconsW) * texture.IconHeight;

    return texture.dds.getRegion(iconX, iconY, texture.IconWidth, texture.IconHeight);
  }

  async getAllIcons() {
    if (!this.iconsIndex) await this.loadIconIndex();
    return this.iconsIndex.filter(icon => icon.texture?.isGameIcon);
  }

  async loadIconIndex() {
    if (this.iconsIndex) return;
    this.iconsIndex = [];
    this.iconTextures = [];

    const filemap = await this.api.getGameFile("data/config/gui/iconfilemap.xml");
    const filemapXML = XMLParser.parse(filemap);
    filemapXML.findChild("IconFileMap").getChildrenOfType("IconFile").forEach(file => {
      this.iconTextures.push({
        filename: this.api.findTextureFile(file.getInlineContent("IconFilename")),
        IconWidth: Number(file.getInlineContent("IconWidth")),
        IconHeight: Number(file.getInlineContent("IconHeight")),
        iconFileID: file.getInlineContent("IconFileID"),
        isGameIcon: file.getInlineContent("IsGameIcon") == "1",
        dds: null
      });
    });

    const iconFile = await this.api.getGameFile("data/config/game/icons.xml");
    const iconsXML = XMLParser.parse(iconFile).findChild("Icons").getChildrenOfType("i");

    for (let icon of iconsXML) {
      const guid = icon.getInlineContent("GUID");
      const variations = icon.findChild("Icons").getChildrenOfType("I");
      for (let variation of variations) {
        this.iconsIndex.push({
          guid,
          texture: this.iconTextures.find(texture => texture.iconFileID == variation.getInlineContent("IconFileID")),
          variation: variation.getInlineContent("VariationID") || 0,
          iconIndex: variation.getInlineContent("IconIndex")
        });
      }
    }
  }
}

/**
 * @typedef {Object} Icon
 * @property {number} width
 * @property {number} height
 * @property {Uint8Array} rgba
 */
