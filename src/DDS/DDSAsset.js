/**
 * DDS Specs:
 * https://docs.microsoft.com/en-us/windows/win32/direct3ddds/dx-graphics-dds-pguide?redirectedfrom=MSDN#dds-file-layout
 * https://docs.microsoft.com/en-us/windows/win32/direct3ddds/dds-header
 * https://docs.microsoft.com/en-us/windows/win32/direct3ddds/dds-pixelformat
 */

import FileAsset from "../Common/FileAsset.js";
import Color from "../Common/Color.js";
import DXTn from "dxtn";
import { Buffer } from "buffer";

const DDSFlags = {
  Caps: 0x1,
  Height: 0x2,
  Width: 0x4,
  Pitch: 0x8,
  PixelFormat: 0x1000,
  MipMapCount: 0x20000,
  LinearSize: 0x80000,
  Depth: 0x800000
}

const PixelFormatFlags = {
  AlphaPixels: 0x1,
  Alpha: 0x2,
  FourCC: 0x4,
  RGB: 0x40,
  YUV: 0x200,
  Luminance: 0x20000
}

/**
 * DirectDraw Surface.
 * Not a full implementation but enough to work with files found in Anno 2070
 */
export default class DDSAsset extends FileAsset {

  constructor() {
    super();
    this.width = null;
    this.height = null;
    this.rgba = null;
  }

  generate(width, height) {
    this.width = width;
    this.height = height;
    this.rgba = Buffer.alloc(width * height * 4);
  }

  /**
   * @param {Buffer} data 
   */
  readData(data) {
    if (data[0] != 0x44 || data[1] != 0x44 || data[2] != 0x53 || data[3] != 0x20) throw new Error("Invalid magic number");

    const size = data.readUInt32LE(4);
    if (size != 124) throw new Error("Header length incorrect");

    const flags = data.readUInt32LE(8);
    this.height = data.readUInt32LE(12);
    this.width = data.readUInt32LE(16);

    const pixelFormatIndex = 76;
    const pixelFormatSize = data.readUInt32LE(pixelFormatIndex);
    if (pixelFormatSize != 32) throw new Error("Pixel format length incorrect");
    const pixelFormatFlags = data.readUInt32LE(pixelFormatIndex + 4);
    const pixelFormatFourCC = data.slice(pixelFormatIndex + 8, pixelFormatIndex + 12).toString("ascii");
    const pixelFormatRGBBitCount = data.readUInt32LE(pixelFormatIndex + 12);
    const pixelFormatRBitMask = data.readUInt32LE(pixelFormatIndex + 16);
    const pixelFormatGBitMask = data.readUInt32LE(pixelFormatIndex + 20);
    const pixelFormatBBitMask = data.readUInt32LE(pixelFormatIndex + 24);
    const pixelFormatABitMask = data.readUInt32LE(pixelFormatIndex + 28);
    const pixelFormatRBitMaskOffset = pixelFormatRBitMask.toString(2).replaceAll("1", "").length;
    const pixelFormatGBitMaskOffset = pixelFormatGBitMask.toString(2).replaceAll("1", "").length;
    const pixelFormatBBitMaskOffset = pixelFormatBBitMask.toString(2).replaceAll("1", "").length;
    const pixelFormatABitMaskOffset = pixelFormatABitMask.toString(2).replaceAll("1", "").length;

    const maindataOffset = 128;
    const numberOfPixels = this.width * this.height;

    // DXT Compressed texture
    if (pixelFormatFlags & PixelFormatFlags.FourCC) {
      if (pixelFormatFourCC == "DXT1") {
        const maindataLength = numberOfPixels * 0.5;
        const maindata = data.subarray(maindataOffset, maindataOffset + maindataLength);
        this.rgba = DXTn.decompressDXT1(this.width, this.height, maindata);
        return;
      }

      if (pixelFormatFourCC == "DXT5") {
        const maindataLength = numberOfPixels * 1;
        const maindata = data.subarray(maindataOffset, maindataOffset + maindataLength);
        this.rgba = DXTn.decompressDXT5(this.width, this.height, maindata);
        return;
      }
    }

    // RGB formatted texture
    if (pixelFormatFlags & PixelFormatFlags.RGB) {      
      if (pixelFormatRGBBitCount == 32) {
        this.rgba = Buffer.alloc(numberOfPixels * 4);
        for (let i = 0; i < numberOfPixels; i++) {
          const coded = data.readUInt32LE(maindataOffset + i * 4);
          const r = (coded & pixelFormatRBitMask) >> pixelFormatRBitMaskOffset;
          const g = (coded & pixelFormatGBitMask) >> pixelFormatGBitMaskOffset;
          const b = (coded & pixelFormatBBitMask) >> pixelFormatBBitMaskOffset;
          const a = (coded & pixelFormatABitMask) >> pixelFormatABitMaskOffset;
          this.rgba[i * 4 + 0] = r;
          this.rgba[i * 4 + 1] = g;
          this.rgba[i * 4 + 2] = b;
          this.rgba[i * 4 + 3] = a;
        }
        return;
      }
    }

    throw new Error("Format not supported yet");
  }

  /**
   * @param {Number} x 
   * @param {Number} y 
   * @returns {Color}
   */
  getPixel(x, y) {
    if (!this.rgba) throw new Error("No image loaded");
    if (x < 0 || x >= this.width) throw new Error("X coordinate out of bounds");
    if (y < 0 || y >= this.height) throw new Error("Y coordinate out of bounds");

    const index = (y * this.width + x) * 4;
    const color = new Color();
    color.setRGBA(this.rgba[index] / 255, this.rgba[index + 1] / 255, this.rgba[index + 2] / 255, this.rgba[index + 3] / 255);
    return color;
  }

  /**
   * @param {Number} x X Position of the pixel
   * @param {Number} y Y Position of the pixel
   * @param {Color} color Color of the pixel
   */
  setPixel(x, y, color) {
    if (!this.rgba) throw new Error("No image loaded");
    if (x < 0 || x >= this.width) throw new Error("X coordinate out of bounds");
    if (y < 0 || y >= this.height) throw new Error("Y coordinate out of bounds");

    const index = (y * this.width + x) * 4;
    this.rgba[index] = color.r * 255;
    this.rgba[index + 1] = color.g * 255;
    this.rgba[index + 2] = color.b * 255;
    this.rgba[index + 3] = color.a * 255;
  }

  /**
   * @param {Number} x 
   * @param {Number} y 
   * @returns {Color}
   */
  sample(u, v) {
    // @ToDo: use something different that nearest neighbor
    return this.getPixel(
      Math.min(Math.floor(u * this.width), this.width - 1),
      Math.min(Math.floor(v * this.height), this.height - 1)
    );
  }

  /**
   * @param {number} x 
   * @param {number} y 
   * @param {number} width 
   * @param {number} height 
   * @returns {DDSAsset}
   */
  getRegion(x, y, width, height) {
    if (width <= 0) throw new Error("Width must be greater than 0");
    if (height <= 0) throw new Error("Height must be greater than 0");

    const x2 = x + width;
    const y2 = y + height;

    const rgba = new Uint8Array(width * height * 4);
    let cursor = 0;
    for (let j = y; j < y2; j++) {
      for (let i = x; i < x2; i++) {
        const color = this.getPixel(i, j);
        rgba[cursor++] = Math.round(color.r * 255);
        rgba[cursor++] = Math.round(color.g * 255);
        rgba[cursor++] = Math.round(color.b * 255);
        rgba[cursor++] = Math.round(color.a * 255);
      }
    }

    const out = new DDSAsset();
    out.width = width;
    out.height = height;
    out.rgba = rgba;
    return out;
  }

  async writeData() {
    if (!this.rgba) throw new Error("No content in file to export");

    const header = Buffer.alloc(128);
    // Magic number
    header[0] = 0x44;
    header[1] = 0x44;
    header[2] = 0x53;
    header[3] = 0x20;

    header.writeUint32LE(124, 4); // Header length
    header.writeUint32LE(DDSFlags.Caps | DDSFlags.Height | DDSFlags.Width | DDSFlags.PixelFormat, 8); // Flags
    header.writeUint32LE(this.height, 12); // Height
    header.writeUint32LE(this.width, 16); // Width
    header.writeUint32LE(0, 20); // Pitch
    header.writeUint32LE(0, 24); // Depth
    header.writeUint32LE(0, 28); // MipMapCount

    // Format
    header.writeUint32LE(32, 76);
    header.writeUint32LE(PixelFormatFlags.RGB | PixelFormatFlags.AlphaPixels, 80);

    header.writeUint32LE(32, 88); // RGBBitCount
    header.writeUint32LE(0x000000FF, 92); // RBitMask
    header.writeUint32LE(0x0000FF00, 96); // GBitMask
    header.writeUint32LE(0x00FF0000, 100); // BBitMask
    header.writeUint32LE(0xFF000000, 104); // ABitMask

    return Buffer.concat([header, this.rgba]);
  }
}
