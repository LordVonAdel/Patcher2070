import FileAsset from "./FileAsset.js";

/**
 * For .abo and .abl files
 */
export default class ABXAsset extends FileAsset {

  constructor() {
    super();

    /**
     * @typeof {ABXBlock}
     */
    this.abx = null;
  }

  /**
   * @param {Buffer} data 
   */
  readData(data) {
    this.abx = ABXParser.parse(data.toString());
  }

  /**
   * @returns {Buffer} content
   */
  writeData() {
    const str = this.abx.writeToString();
    console.log(str);
    return Buffer.from(str);
  }

}

class ABXTag {
  constructor() {
    this.type = "";
    this.parameters = [];
    this.comment = "";
  }

  writeToString() {
    return this.comment.length > 0 ?
      `[${this.type}=${this.parameters.join(";")}:${this.comment}]`
      : `[${this.type}=${this.parameters.join(";")}]`
  }
}

class ABXBlock {
  constructor() {
    this.content = [];
  }

  writeToString() {
    return `{\n${this.content.map(cnt => cnt.writeToString()).join("\n")}\n}`;
  }
}

class ABXParser {

  /**
   * @param {String} string 
   */
  static parse(string) {
    string = string.trim();

    let blockStack = [
      new ABXBlock()
    ];

    let inTag = false;
    let currentTagString = "";

    for (let i = 0; i < string.length; i++) {
      const char = string[i];

      if (char == "[" && !inTag) {
        inTag = true;
        currentTagString = "";
        continue;
      }

      if (char == "]" && inTag) {
        inTag = false;
        blockStack[blockStack.length - 1].content.push(ABXParser.parseTag(currentTagString));
        continue;
      }

      if (char == "{") {
        if (inTag) throw new Error("Can't open block while still in tag");
        const block = new ABXBlock();
        blockStack[blockStack.length - 1].content.push(block);
        blockStack.push(block);
        continue;
      }

      if (char == "}") {
        if (inTag) throw new Error("Can't close block while still in tag");
        blockStack.pop();
        continue;
      }

      currentTagString += char;
    }

    return blockStack[0];
  }

  /**
   * @param {string} string 
   * @returns {ABXTag}
   */
  static parseTag(string) {
    const tag = new ABXTag();
    tag.type = string.split("=")[0];
    tag.comment = string.includes(":") ? string.substring(string.indexOf(":") + 1) : "";
    tag.parameters = string.includes("=") ? string.split("=")[1].split(":")[0].split(";") : [];
    return tag;
  }
}