import XMLAsset from "../Common/XMLAsset.js";

/**
 * ISD files store data about island presets. All islands in Anno are premade and placed into the game world.
 */
export default class ISDAsset extends XMLAsset {

  constructor() {
    super();
  }

  readData(data) {
    super.readData(data);

    // Sanity checky
    let usedChunks = this.xml.findChild("UsedChunks");
    let xSize = usedChunks.getInlineContent("m_XSize");
    let ySize = usedChunks.getInlineContent("m_YSize");
    if (this.width / xSize != ISDAsset.CHUNK_SIZE || this.height / ySize != ISDAsset.CHUNK_SIZE) throw new Error("Chunk bitmap / Island size mismatch");
  }

  /**
   * Width of the island in tiles (X-Axis)
   * @returns {number}
   */
  get width() {
    if (!this.xml) throw new Error("No data in Island");
    return Number(this.xml.getInlineContent("Width"));
  }

  /**
   * Height of the island in tiles (Z-Axis)
   * @returns {number}
   */
  get height() {
    if (!this.xml) throw new Error("No data in Island");
    return Number(this.xml.getInlineContent("Height"));
  }

  static CHUNK_SIZE = 16;
}