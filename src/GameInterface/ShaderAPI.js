import Path from "path";
import fs from "fs";

export default class ShaderAPI {

  constructor(gameInterface) {
    /**
     * @private
     */
    this.gameInterface = gameInterface;

    /**
     * @private
     */
    this.shadersModified = false;
  }

  /**
   * @returns {string} Path of the cache directory. "%APPDATA%/Ubisoft/Anno 2070/Config/fxo"
   */
  getCacheDirectory() {
    return Path.join(process.env.APPDATA, "Ubisoft/Anno 2070/Config/fxo");
  }

  /**
   * @param {string} shaderPath Path of the shader excluding "data/system/shaders/". For Exmaple: "fx/street.fx"
   * @param {Buffer} content Text content of the shader
   */
  async updateShader(shaderPath, content) {
    await this.gameInterface.updateFile(content, "data/system/shaders/" + shaderPath);
    this.shadersModified = true;
  }

  /**
   * Deletes all cached shader files.
   */
  async resetCache() {
    const files = await fs.promises.readdir(this.getCacheDirectory());
    for (const file of files) {
      const filepath = Path.join(this.getCacheDirectory(), file);
      if (file.endsWith(".fxo") || file == "cache.xml") {
        await fs.promises.unlink(filepath);
      }
    }
  }

}