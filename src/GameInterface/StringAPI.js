import XMLParser from "../Common/XMLParser.js";
import GameInterface from "./GameInterface.js";

export default class StringAPI {

  /**
   * @param {GameInterface} gameInterface 
   */
  constructor(gameInterface) {
    /**
     * @private
     * @type {GameInterface}
     */
    this.gameInterface = gameInterface;

    /**
     * @private
     */
    this.GUIDRangeMin = 6920000;

    /**
     * @private
     */
    this.GUIDRangeMax = 6999999;

    /**
     * @private
     */
    this.nextGUID = this.GUIDRangeMin;

    this.ranges = null;
  }

  /**
   * Adds a string to the game and returns its GUID
   * @param {Object<LangID, string>} texts Text to have in the game
   * @param {LangID} defaultLanguage Language to use if no translation for the target language exists
   * @returns {Number} GUID
   * @throws Will throw an error if no GUIDs are free
   */
  async addString(texts, defaultLanguage = "eng") {
    const guid = await this.getNextGUID();
    return await this.setStringOfGUID(guid, texts, defaultLanguage);
  }

  async getNextGUID() {
    const guid = this.nextGUID++;
    if (guid > this.GUIDRangeMax) {
      throw new Error("Ran out of free GUIDs");
    }
    return guid;
  }

  async getString(guid) {
    let content;
    const fileOfGUID = await this.getFileOfGUID(guid);
    for (let language of StringAPI.GameLanguages) {
      const localFilePath = `data/loca/${language}/${fileOfGUID}`;
      if (!this.gameInterface.doesFileExist(localFilePath)) continue;
      content = await this.gameInterface.getGameFile(localFilePath);
      break;
    }

    // String not found
    if (!content) return "";

    const lines = content.toString("utf16le").split("\n");
    const searchString = `${guid}=`;
    const line = lines.find(line => line.startsWith(searchString));
    if (!line) return "";
    return line.replace(searchString, "");
  }

  async setStringOfGUID(guid, texts, defaultLanguage = "eng") {
    const fileOfGUID = await this.getFileOfGUID(guid);
    for (let language of StringAPI.GameLanguages) {
      const localFilePath = `data/loca/${language}/${fileOfGUID}`;
      if (!this.gameInterface.doesFileExist(localFilePath)) continue;

      let value = texts[language] || texts[defaultLanguage];
      let content = await this.gameInterface.getGameFile(localFilePath);

      const textContent = content.toString("utf16le");
      let lines = textContent.split("\n");

      // Remove line if already exist
      lines = lines.filter(line => !line.startsWith(`${guid}`));

      // Add new text
      lines.push(`${guid}=${value}`);

      // Rejoin to full text file
      let fullContent = lines.join("\n");

      this.gameInterface.updateFile(Buffer.from(fullContent, "utf16le"), localFilePath);
    }
    return guid;
  }

  getGUIDUsage() {
    return (this.nextGUID - this.GUIDRangeMin) / (this.GUIDRangeMax - this.GUIDRangeMin);
  }

  async getFileOfGUID(guid) {
    guid = Number(guid);

    if (!this.ranges) {
      this.ranges = [];
      const localFile = await this.gameInterface.findGameFile(file => file.filepath.endsWith("localisation.xml"));
      if (!localFile) throw new Error("No localisation index found!");
      await this.fillIndex(localFile.filepath);
    
      // It looks like addon localization overwrites every entry of localization. But we merge it just to be sure and be compatible with eventual pre modded games.
      if (this.gameInterface.isAddonInstalled) {
        const addonLocalFile = await this.gameInterface.findGameFile(file => file.filepath.endsWith("localisation_addon.xml"));
        if (!addonLocalFile) throw new Error("No addon localisation index found!");
        await this.fillIndex(addonLocalFile.filepath);
      }
    }

    return this.ranges.find(range => range.min <= guid && range.max >= guid)?.filename;
  }

  /**
   * @private
   * @param {String} filename Path to localisation.xml
   */
  async fillIndex(filename) {
    const data = await this.gameInterface.getGameFile(filename);
    const xml = XMLParser.parse(data);

    const texts = xml.findChild("Localisation").getChildrenOfType("Text");
    for (let text of texts) {
      const filename = text.getInlineContent("Filename").toLowerCase();
      const range = this.ranges.find(range => range.filename === filename);
      if (range) {
        range.min = Number(text.getInlineContent("GUIDRangeMin"));
        range.max = Number(text.getInlineContent("GUIDRangeMax"));
      } else {
        this.ranges.push({
          min: Number(text.getInlineContent("GUIDRangeMin")),
          max: Number(text.getInlineContent("GUIDRangeMax")),
          filename: text.getInlineContent("Filename").toLowerCase()
        });
      }
    }
  }

  /**
   * Adds or updates a css class in data/config/gui/textstyles.css
   * @param {string} classname Updates the content of a class used in tooltips. Creates a new if it does not exist.
   * @param {string} content Content for the class
   */
  async updateCSSClass(classname, content) {
    let fileContent = (await this.gameInterface.getGameFile("data/config/gui/textstyles.css")).toString();
    if (!fileContent) throw new Error(`CSS file not found!`);

    // Remove class if it already exists
    const existingClassIndex = fileContent.indexOf(`.${classname}`);
    if (existingClassIndex >= 0) {
      const closingBracket = fileContent.indexOf("}", existingClassIndex);
      fileContent = fileContent.substring(0, existingClassIndex) + fileContent.substring(closingBracket);
    }

    // Add new class
    fileContent += `\n.${classname} {\n${content}\n}\n`;

    this.gameInterface.updateFile(Buffer.from(fileContent, "utf8"), "data/config/gui/textstyles.css");
  }

  static GameLanguages = ["ger", "cze", "eng", "esp", "fra", "ita", "pol", "rus"];
}

/**
 * @typedef {"ger"|"cze"|"eng"|"esp"|"fra"|"ita"|"pol"|"rus"} LangID
 */