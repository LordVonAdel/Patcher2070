/**
 * Sources: 
 * https://github.com/lysannschlegel/RDAExplorer/wiki/RDA-File-Format
 * https://github.com/lysannschlegel/AnnoRDA
 * https://github.com/lysannschlegel/RDAExplorer/blob/master/src/RDAExplorer/RDAReader.cs#L199
 */
import { Buffer } from "buffer";
import { Decrypt, Encrypt } from "./Encryption.js";
import { Compress, Decompress } from "./Compression.js";
import Zlib from "zlib";
import FileAsset from "../Common/FileAsset.js";

const magicV20 = Buffer.from([0x52, 0x00, 0x65, 0x00, 0x73, 0x00, 0x6F, 0x00, 0x75, 0x00, 0x72, 0x00, 0x63, 0x00, 0x65, 0x00, 0x20, 0x00, 0x46, 0x00, 0x69, 0x00, 0x6C, 0x00, 0x65, 0x00, 0x20, 0x00, 0x56, 0x00, 0x32, 0x00, 0x2E, 0x00, 0x30, 0x00]);
const magicV22 = Buffer.from([0x52, 0x65, 0x73, 0x6F, 0x75, 0x72, 0x63, 0x65, 0x20, 0x46, 0x69, 0x6C, 0x65, 0x20, 0x56, 0x32, 0x2E, 0x32]);

/**
 * File Version enum
 * @readonly
 * @enum {string}
 */
const FILE_VERSION = {
  V2_0: "2.0",
  V2_2: "2.2"
};

/**
 * Block flags enum
 * @readonly
 * @enum {Number}
 */
const BLOCK_FLAGS = {
  COMPRESSED: 0x01,
  ENCRYPTED: 0x02,
  RESIDENT: 0x04,
  DELETED: 0x08
};

/**
 * @class RDAAsset
 * RDA is the extension for archive files used in the Anno games. They are found in the 'maindata' directory of the installation directory of the game.
 * 
 * This class can read these files, modify its state, and output it as a file.
 */
export default class RDAAsset extends FileAsset {

  constructor() {
    super();

    /**
     * @property {Buffer} raw
     */
    this.raw = null;

    /**
     * @property {RDABlock[]} blocks
     */
    this.blocks = null;

    /**
     * @property {RDAFile[]} files
     */
    this.files = null;

    this.fileVersion = null;
  }

  /**
   * 
   * @param {Buffer} data 
   */
  async readData(data) {
    this.blocks = [];
    this.files = [];

    const magic = data.slice(0, magicV20.length);
    this.fileVersion = null;

    if (magic.equals(magicV22)) {
      this.fileVersion = FILE_VERSION.V2_2;
    }

    if (magic.equals(magicV20)) {
      this.fileVersion = FILE_VERSION.V2_0;
    }
    
    if (!this.fileVersion) {
      throw new Error("File corrupted or not a Resource File");
    }

    this.raw = data;

    const firstBlockOffset = data.readUInt32LE(
      this.fileVersion === FILE_VERSION.V2_0 ? 1044 : 788
    );

    let nextBlockHeaderOffset = firstBlockOffset;
    let blockData;

    // Itterate linked block header list
    while (nextBlockHeaderOffset < data.length) {
      blockData = new RDABlock(this, nextBlockHeaderOffset);
      nextBlockHeaderOffset = blockData.nextBlockHeaderOffset;
      this.blocks.push(blockData);
    }
  }

  /**
   * Returns every file as path found in this archive.
   * @returns {String[]} List of filepaths
   */
  getIndex() {
    return this.files.map(file => file.path);
  }

  /**
   * Returns the content of a given filepath as buffer
   * @param {string} path 
   * @return {Buffer}
   */
  extractFile(path) {
    path = this.normalizeInsidePath(path);
    const file = this.files.find(file => file.path === path);
    if (!file) {
      throw new Error(`File ${path} not found`);
    }

    return file.getContent();
  }

  doesFileExists(path) {
    path = this.normalizeInsidePath(path);
    return this.files.some(file => file.path === path);
  }

  normalizeInsidePath(path) {
    return path.replace(/\\/g, "/");
  }

  async writeData(options = {}) {
    options.version = options.version ?? FILE_VERSION.V2_0;
    options.encrypt = options.encrypt ?? false;
    options.compress = options.compress ?? true;
    options.memoryResident = options.memoryResident ?? true;

    if (options.version != FILE_VERSION.V2_0) {
      throw new Error(`File version ${version} not supported for writing yet!`);
    }

    const header = Buffer.alloc(1048);
    magicV20.copy(header, 0);

    let out = header;
    let lastHeaderOffsetOffset = 1044;

    for (let i = 0; i < this.blocks.length; i++) {
      const block = this.blocks[i];
      this.log(`Writing block ${i+1} of ${this.blocks.length}`);
      const blockBuffer = await block.write(options)
      out = Buffer.concat([out, blockBuffer]);
      out.writeUInt32LE(out.length - 20, lastHeaderOffsetOffset);
      lastHeaderOffsetOffset = out.length - 4;      
    }

    return out;
  }

  /**
   * Calculates the total size of all files when uncompressed.
   * @returns {Number} total size in bytes
   */
  getUncompressedSize() {
    let total = 0;
    for (let k in this.files) {
      let file = this.files[k];
      total += file.uncompressedSize;
    }
    return total;
  }

  /**
   * Adds a new file to this archive
   * @param {string} path 
   * @param {Buffer} content 
   */
  updateFile(path, content) {
    let file = this.files.find(file => file.path === path);
    if (file) { // Update file if already exists
      file.setContent(path, content);
      return true;
    }

    // Else create the file 
    const block = this.blocks[0];
    if (!block) {
      throw new Error("No block to add data to available!");
    }

    file = new RDAFile(this, block);
    file.setContent(path, content);
    this.files.push(file);
    block.files.push(file);
  }

  log(message) {
    console.log("[RDA Asset]", message);
  }
}

class RDABlock {

  /**
   * 
   * @param {RDAAsset} reader 
   * @param {Number} headerOffset 
   */
  constructor(reader, headerOffset) {
    this.raw = reader.raw;
    this.reader = reader;
    this.residentUncompressedSize = 0;
    this.residentCompressedSize = 0;
    this.headerOffset = headerOffset;
    this.fileHeadersOffset = 0;
    this.files = [];

    if (this.reader.fileVersion === FILE_VERSION.V2_2) throw new Error("RDA Version 2.2 is not supported yet");

    this.flags = this.raw.readUInt32LE(headerOffset);
    const numberOfFiles = this.raw.readUInt32LE(headerOffset + 4);

    // Length of compressed file header section
    this.compressedFileHeader = this.raw.readUInt32LE(headerOffset + 8);
    
    // Length of uncompressed file header section
    this.uncompressedFileHeader = this.raw.readUInt32LE(headerOffset + 12);

    this.nextBlockHeaderOffset = this.raw.readUInt32LE(headerOffset + 16);

    this.isCompressed = (this.flags & BLOCK_FLAGS.COMPRESSED) > 0;
    this.isEncrypted = (this.flags & BLOCK_FLAGS.ENCRYPTED) > 0;
    this.isMemoryResident = (this.flags & BLOCK_FLAGS.RESIDENT) > 0;
    this.isDeleted = (this.flags & BLOCK_FLAGS.DELETED) > 0;
    if (this.isDeleted) return;
    if (numberOfFiles == 0) return;

    this.fileHeadersOffset = headerOffset - this.compressedFileHeader;
    if (this.isMemoryResident) {
      this.fileHeadersOffset -= 8;
      this.residentCompressedSize = this.raw.readUInt32LE(headerOffset - 8);
      this.residentUncompressedSize = this.raw.readUInt32LE(headerOffset - 4);
    }

    let fileHeadersBuffer = this.raw.slice(this.fileHeadersOffset, this.fileHeadersOffset + this.compressedFileHeader);

    if (numberOfFiles * 540 != this.uncompressedFileHeader) {
      throw new Error("Uncompressed file header length does not match number of files");
    }

    if (this.compressedFileHeader != fileHeadersBuffer.length) {
      throw new Error("Something went really wrong");
    }

    if (this.isEncrypted) {
      fileHeadersBuffer = Decrypt(fileHeadersBuffer, 0xA2C2A );
    }
    
    if (this.isCompressed) {
      fileHeadersBuffer = Zlib.inflateSync(fileHeadersBuffer);
    }

    for (let i = 0; i < numberOfFiles; i++) {
      const fileOffset = i * 540;
      const fileHeader = fileHeadersBuffer.slice(fileOffset, fileOffset + 540);
      const file = new RDAFile(reader, this);
      file.fromData(fileHeader);
      this.files.push(file);
      reader.files.push(file);
    }
  }

  getFileChunk() {
    if (!this.isMemoryResident) return null;

    let fileBlockOffset = this.fileHeadersOffset - this.residentCompressedSize;
    let chunk = this.raw.slice(fileBlockOffset, fileBlockOffset + this.residentCompressedSize);

    if (this.isEncrypted) {
      chunk = Decrypt(chunk, 0xA2C2A);
    }

    if (this.isCompressed) {
      chunk = Zlib.inflateSync(chunk);
    }

    return chunk;
  }

  async write(options) {
    if (options.version == FILE_VERSION.V2_2) throw new Error("Writing blocks to RDA Version 2.2 is not supported yet");
    if (!options.memoryResident) throw new Error("No memory resident blocks are supported yet");
    if (!options.compress) throw new Error("Uncompressed writing is not supported yet");

    let flags = 0;
    if (options.encrypt) flags |= BLOCK_FLAGS.ENCRYPTED;
    if (options.compress) flags |= BLOCK_FLAGS.COMPRESSED;
    if (options.memoryResident) flags |= BLOCK_FLAGS.RESIDENT;

    const files = this.files.filter(file => !file.isDeleted);

    let dataBlock = Buffer.alloc(0);
    let headerBlock = Buffer.alloc(0);

    this.reader.log(`Writing ${files.length} files...`);
    for (let file of files) {
      const content = file.getContent();

      const header = Buffer.alloc(540);
      header.write(file.path, 0, 520, "utf16le");
      header.writeUInt32LE(dataBlock.length, 520);
      header.writeUInt32LE(content.length, 524); // Compressed file size
      header.writeUInt32LE(content.length, 528); // Uncompressed file size
      header.writeUInt32LE(0, 532); // Timestamp

      headerBlock = Buffer.concat([headerBlock, header]);
      dataBlock = Buffer.concat([dataBlock, content]);
    }

    this.reader.log("Compressing...");
    const dataBlockSize = dataBlock.length;
    const dataBlockCompressed = await Compress(dataBlock);
    const dataBlockCompressedSize = dataBlockCompressed.length;
    const headerBlockCompressed = await Compress(headerBlock);

    const residentHeader = Buffer.alloc(8);
    residentHeader.writeUInt32LE(dataBlockCompressedSize, 0);
    residentHeader.writeUInt32LE(dataBlockSize, 4);

    const blockHeader = Buffer.alloc(20);
    blockHeader.writeUInt32LE(flags, 0);
    blockHeader.writeUInt32LE(files.length, 4);
    blockHeader.writeUInt32LE(headerBlockCompressed.length, 8);
    blockHeader.writeUInt32LE(headerBlock.length, 12);
    blockHeader.writeUInt32LE(0xFFFFFFFF, 16); // Offset to next block header (will be set outside this function)

    this.reader.log("Encrypt...");
    if (options.encrypt) {
      dataBlockCompressed = Encrypt(dataBlockCompressed, 0xA2C2A);
      headerBlockCompressed = Encrypt(headerBlockCompressed, 0xA2C2A);
    }

    return Buffer.concat([
      dataBlockCompressed,
      headerBlockCompressed,
      residentHeader,
      blockHeader
    ]);
  }
}

/**
 * Handle for files inside an RDA Archive
 */
class RDAFile {
  /**
   * @param {RDAAsset} reader 
   * @param {Number} headerOffset
   */
  constructor(reader, block) {
    this.reader = reader;
    this.block = block;

    this.path = "";
    this.offset = 0;
    this.compressedSize = 0;
    this.uncompressedSize = 0;
    this.modificationTimestamp = 0;

    this.content = null;

    this.isDeleted = false;
  }

  async fromData(data) {
    this.path = data.toString("utf16le", 0, 256).replace(/\0/g, "");
    this.offset = data.readUInt32LE(520);
    this.compressedSize = data.readUInt32LE(524);
    this.uncompressedSize = data.readUInt32LE(528);
    this.modificationTimestamp = data.readUInt32LE(532);
  }

  get isCompressed() {
    return this.block.isCompressed;
  }

  get isEncrypted() {
    return this.block.isEncrypted;
  }

  get isMemoryResident() {
    return this.block.isMemoryResident;
  }

  /**
   * Returns the content of this file
   * @returns {Buffer} Contents of the file
   */
  getContent() {
    if (this.isDeleted) throw new Error("Can't read from deleted file!");
    if (this.content) return this.content;

    if (!this.isMemoryResident) {
      let data = this.block.reader.raw.slice(this.offset, this.offset + this.compressedSize);
      if (this.isEncrypted) {
        data = Decrypt(data, 0xA2C2A);
      }
      if (this.isCompressed) {
        data = Zlib.inflateSync(data);
      }
      this.content = data;
      return data;
    } 

    const chunk = this.block.getFileChunk();
    const data = chunk.slice(this.offset, this.offset + this.uncompressedSize);
    this.content = data;
    return data;
  }

  setContent(path, content) {
    this.path = path;
    this.content = content;
    this.uncompressedSize = this.content.length;
  }

  /**
   * Marks this file as deleted
   */
  delete() {
    this.content = null;
    this.isDeleted = true;
  }
}