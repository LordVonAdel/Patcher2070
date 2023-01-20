/**
 * Own XML implementation because I think we are not very standard here.
 * ISD files have multiple root nodes
 * They also don't seem to use attributes
 * Some tags are closed with </>
 * CDATA sections are not wrapped in <![ ... ]>
*/

export default class XMLParser {

  constructor() {
    this.data = null;
  }

  /**
   * @private
   */
  _getCharAtIndex(index) {
    if (index > this.data.length) throw new Error("Index out of bounds");
    return String.fromCharCode(this.data[index]);
  }

  /**
   * Parses Annoish-XML formatted data. Adds a root element to the data, because multiple root nodes are sometimes used in a file.
   * @param {Buffer} data Binary data
   * @returns {XMLElement}
   */
  parse(data) {
    this.data = data;

    let offset = 0;
    let out = [];
    offset = this._skipWhitespace(offset);
    while (offset < data.length) {
      let node;
      [offset, node] = this._readNode(offset);
      out.push(node);
      offset = this._skipWhitespace(offset);
    }
    let outElement = new XMLElement("root");
    outElement.content = out;
    return outElement;
  }

  /**
   * @private
   */
  _readNode(offset) {
    let tagName;
    [offset, tagName] = this._readTag(offset);
    if (tagName.endsWith("/>")) {
      let outElement = new XMLElement(tagName.replace(">", "").replace("<", "").replace("/", ""));
      return [offset, outElement];
    }
    let outElement = new XMLElement(tagName.replace(">", "").replace("<", ""));

    while (true) {
      offset = this._skipWhitespace(offset);
      let node;
      let char = this._getCharAtIndex(offset);
      if (char == "<") { // this tag is closing or a new one is opening
        let [tagOffset, tag] = this._readTag(offset);
        if (tag[1] == "/") { // closing tag can differ from opening tag...
          offset = tagOffset;
          break;
        }
  
        [offset, node] = this._readNode(offset);
        outElement.content.push(node);
      } else {
        [offset, node] = this._readContent(offset);
        outElement.inlineContent = node;
      }
    }
    return [offset, outElement];
  }

  /**
   * @private
   */
  _readTag(offset) {
    offset = this._skipWhitespace(offset);

    let tagName = "";
    let char;
    do {
      char = this._getCharAtIndex(offset);
      tagName += char;
      offset++;
    } while (char != ">");

    return [offset, tagName];
  }

  _skipWhitespace(offset) {
    let char;
    while (offset < this.data.length) {
      char = this._getCharAtIndex(offset);
      if (char == " " || char == "\t" || char == "\n" || char == "\r") {
        offset++;
      } else {
        break;
      }
    }
    return offset;
  }

  /**
   * @private
   */
  _readContent(offset) {
    offset = this._skipWhitespace(offset);

    let content = "";
    let char;
    while (true) {
      char = this._getCharAtIndex(offset);
      if (char == "<") {
        break;
      }
      content += char;

      if (content == "CDATA[") {
        offset++;
        let blockLength = this.data.readUInt32LE(offset);
        offset += 4;
        content = this.data.slice(offset, offset + blockLength);
        offset += blockLength;
        offset += 1;
        break;
      }

      offset++;
    }
    return [offset, content];
  }

  /**
   * Parses Annoish-XML formatted data. Adds a root element to the data, because multiple root nodes are sometimes used in a file.
   * @param {Buffer} data Binary data
   * @returns {XMLElement} Root node
   */
  static parse(data) {
    const xml = new XMLParser();
    return xml.parse(data);
  }
}

export class XMLElement {
  constructor(name) {
    this.name = name.trim();
    this.content = [];
    this.inlineContent = "";
  }

  /**
   * Returns the inline content of this node. When childName is given, the content of the first child with the given name is returned
   * @param {String} childName Tag name of a child element to take its inline content
   * @returns {String|Buffer} The inline content. Buffer if containing CDATA
   */
  getInlineContent(childName = null) {
    if (childName) {
      return this.findChild(childName)?.inlineContent;
    }
    return this.inlineContent;
  }

  setInlineContent(content, childName = null) {
    if (childName) {
      const child = this.findChild(childName, 0, true);
      child.setInlineContent(content);
      return;
    }
    this.inlineContent = content;
  }

  createChildTag(tagname) {
    let child = new XMLElement(tagname);
    this.addChild(child);
    return child;
  }

  addChild(element) {
    this.content.push(element);
  }

  addChildAtIndex(element, index) {
    this.content.splice(index, 0, element);
  }

  removeChild(element) {
    const index = this.content.indexOf(element);
    if (index >= 0) { 
      this.content.splice(index, 1);
    }
  }

  /**
   * 
   * @param {string} tagName Non case sensitive tag name
   * @param {number} index 
   * @returns {XMLElement|null} Matching element
   */
  findChild(tagName, index = 0, createIfNotFound = false) {
    const lowerCase = tagName.toLowerCase();
    const child = this.content.filter(node => node.name.toLowerCase() == lowerCase);
    if (child.length > 0) {
      return this.content.filter(node => node.name.toLowerCase() == lowerCase)[index];
    }
    if (createIfNotFound) {
      return this.createChildTag(tagName);
    } else {
      return null;
    }
  }

  /**
   * Returns all direct child elements of the given tag type
   * @param {string} tagName Non case sensitive tag name
   * @returns {XMLElement[]}
   */
  getChildrenOfType(tagName) {
    let lowerCase = tagName.toLowerCase();
    return this.content.filter(node => node.name.toLowerCase() == lowerCase);
  }

  /**
   * Returns the first direct child on which the function returns true
   * @param {function} filter Filter function
   * @returns {XMLElement|null} The first found child matching the filter
   */
  queryChild(filter) {
    for (let child of this.content) {
      if (filter(child)) return child;
    }
  }

  /**
   * Recursivly executes a function for all children and their children
   * @param {Function} callback Function to execute for every child
   */
  traverse(callback) {
    callback(this);
    this.content.forEach(node => node.traverse(callback));
  }

  /**
   * Returns this element in XML format ready to be stored in a file
   * @returns {Buffer} Buffer containing XML formatted data
   */
  toBuffer(ignoreRoot = true, purgeEmpty = false) {
    let buff = Buffer.alloc(0);
    if (!ignoreRoot) {
      buff = Buffer.concat([buff, Buffer.from("<" + this.name + ">")]);
    }

    if (this.inlineContent !== "") {
      if (Buffer.isBuffer(this.inlineContent)) {
        const binaryLength = this.inlineContent.length;
        const lengthBuffer = Buffer.alloc(4);
        lengthBuffer.writeUInt32LE(binaryLength, 0);

        buff = Buffer.concat([
          buff,
          Buffer.from("CDATA["),
          lengthBuffer,
          Buffer.from(this.inlineContent),
          Buffer.from("]")
        ]);
      } else {
        buff = Buffer.concat([buff, Buffer.from(String(this.inlineContent))]);
      }
    }

    for (let child of this.content) {
      if (purgeEmpty && !child.hasContent()) {
        continue;
      }
      buff = Buffer.concat([buff, child.toBuffer(false, purgeEmpty)]);
    }

    if (!ignoreRoot) {
      buff = Buffer.concat([buff, Buffer.from("</" + this.name + ">")]);
    }
    return buff;
  }

  clear() {
    this.inlineContent = "";
    this.content.length = 0;
  }

  hasContent() {
    return this.inlineContent || this.content.length > 0;
  }
}