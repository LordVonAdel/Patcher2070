import FileAsset from "../Common/FileAsset.js";

/**
 * 0xF77F0000 <- What does this mean?
 */

/**
 * I really don't understand this file format
 */

export default class CDFAsset extends FileAsset {

  /**
   * @param {Buffer} data 
   */
  readData(data) {
    if (data[0] != 0xFF || data[1] != 0xFF || data[2] != 0xFF || data[3] != 0xFF) throw new Error("Invalid magic number");


  }

}