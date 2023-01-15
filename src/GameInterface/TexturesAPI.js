import { XMLElement } from "../Common/XMLParser.js";
import DDSAsset from "../DDS/DDSAsset.js";
import GameInterface from "./GameInterface.js";

/**
 * Some textures have an ABM file with them that looks like a mask for transparent pixels.
 */

export default class TexturesAPI {

  /**
   * @type {GameInterface}
   */
  #api;

  /**
   * @param {GameInterface} api 
   */
  constructor(api) {
    this.#api = api;
  }

  /**
   * Converts an image to an DDS Asset
   * @param {string} systemPath Path to an image
   * @returns {DDSAsset}
   */
  async DDSAssetFromSystemFile(systemPath) {
    if (systemPath.endsWith(".dds")) {
      const asset = new DDSAsset();
      await asset.readFile(systemPath);
      return asset;
    }
    return null;
  }

  /**
   * @param {DDSAsset} dds 
   * @param {string} textureName 
   */
  async addUITexture(dds, textureName) 
  {
    const paths = {
      abm: `data/graphics/ui/textures/${textureName}.abm`,
      dds: `data/graphics/ui/textures/${textureName}_0.dds`,
      bkg: `data/config/gui/backgrounds/${textureName}.bkg`
    }

    const abm = this.#generateABMOfDDS(dds);
    const bkg = this.#generateBKGOfDDS(dds, paths.dds);

    await this.#api.updateFile(bkg, paths.bkg);
    await this.#api.updateFile(abm, paths.abm);
    await this.#api.updateFile(await dds.writeData(), paths.dds);

    return paths;
  }

  #generateABMOfDDS(dds) {
    const HEADER_SIZE = 12;

    const abm = Buffer.alloc(HEADER_SIZE + (dds.width * dds.height) / 8);
    abm.fill(0xFF);

    // Magic Number
    abm[0] = 0x41;
    abm[1] = 0x42;
    abm[2] = 0x4D;
    abm[3] = 0x00; // Sometimes 2
    abm.writeUint32LE(dds.width, 4);
    abm.writeUint32LE(dds.height, 8);
    return abm;
  }

  #generateBKGOfDDS(dds, texturePath) {
    const bkg = new XMLElement("BackgroundLayout");
    bkg.createChildTag("m_localIconFileMap").createChildTag("i").setInlineContent(texturePath.replace("_0.dds", ".png"));

    const backgroundInfo = bkg.createChildTag("m_backgroundInfo");
    const item = backgroundInfo.createChildTag("i");
    item.setInlineContent("EmptyLayout", "LayoutName");
    item.setInlineContent(0, "flags");
    item.setInlineContent(1, "m_XSize");
    item.setInlineContent(1, "m_YSize");
    item.setInlineContent(0, "m_Color_H");
    item.setInlineContent(1, "m_Color_S");
    item.setInlineContent(1, "m_Color_V");
    item.setInlineContent(1, "m_Color_A");
    item.setInlineContent(0, "m_IconColor_H");
    item.setInlineContent(1, "m_IconColor_S");
    item.setInlineContent(1, "m_IconColor_V");
    item.setInlineContent(1, "m_IconColor_A");
    const clientAreaOffset = item.createChildTag("ClientAreaOffset");
    clientAreaOffset.setInlineContent(0, "left");
    clientAreaOffset.setInlineContent(0, "top");
    clientAreaOffset.setInlineContent(0, "right");
    clientAreaOffset.setInlineContent(0, "bottom");
    item.setInlineContent(-1, "m_StencilIconGUID");
    const iconList = item.createChildTag("IconList");
    const icon = iconList.createChildTag("i");
    icon.setInlineContent(0, "LocalFileID");
    icon.setInlineContent(0, "tileX"); // offset in pixels
    icon.setInlineContent(0, "tileY"); // offset in pixels
    icon.setInlineContent(dds.width, "tileWidth");
    icon.setInlineContent(dds.height, "tileHeight");
    icon.setInlineContent(68, "flags");
    icon.setInlineContent(0, "Width");
    icon.setInlineContent(0, "Height");
    return bkg.toBuffer(false);
  }
}
