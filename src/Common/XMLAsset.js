import FileAsset from "./FileAsset.js";
import XMLParser from "./XMLParser.js";

export default class XMLAsset extends FileAsset {

  constructor() {
    super();
    this.xml = null;
  }

  /**
   * @param {Buffer} data 
   */
  readData(data) {
    const parser = new XMLParser();
    this.xml = parser.parse(data);
  }

  writeData() {
    if (!this.xml) throw new Error("Asset not loaded/initialized");
    return this.xml.toBuffer(true);
  }

}