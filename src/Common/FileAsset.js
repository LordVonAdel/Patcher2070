import fs from 'fs';

/**
 * Asset classes can read files, modify the states and can write them back.
 * @abstract
 */
export default class FileAsset {

  dataFilePath = null;

  /**
   * @param {Buffer} data 
   */
  async readData(data) {
    throw new Error("Reading is not implemented for this type of asset. Try to create a new one with .create()");
  }

  /**
   * Reads a file and loads its content into this asset object.
   * @param {string} filePath
   */
  async readFile(filePath) {
    const data = await fs.promises.readFile(filePath);
    await this.readData(data);
  }

  /**
   * Initializes this as an empty asset
   */
  async generate() {
    throw new Error("Creating is not implemented for this type of asset. Try to read one with .readData() and modify it.");
  }

  /**
   * @returns {Buffer}
   */
  async writeData() {
    throw new Error("Writing is not implemented for this type of asset. It can only be used to extract data.");
  }

  /**
   * @param {string} filePath
   */
  async writeToFile(filePath) {
    console.log("[File] Writing data for ", filePath);
    const data = await this.writeData();
    await fs.promises.writeFile(filePath, data);
  }

  /**
   * Merges data from another file into this one
   * @param {FileAsset} other Other asset
   */
  async merge(other) {
    throw new Error("Merging not supported for this type of asset");
  }

}