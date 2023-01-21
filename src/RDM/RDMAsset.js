/**
 * Sources:
 * https://github.com/kskudlik/Anno-1800-Model-Converter/blob/master/RDM-Converter/src/RDMFile.cpp
 */
import VertexFormat from "./VertexFormat.js";
import { Buffer } from "buffer";
import FileAsset from "../Common/FileAsset.js";

/**
 * RDM is the file extension for 3D meshes. It holds mostly geometry data. Metadata about models is saved in .cfg files.
 */
export default class RDMAsset extends FileAsset {

  constructor() {
    super();

    /**
     * @property {Buffer} raw
     */
    this.raw = null;

    /**
     * @property {any[]} vertices
     */
    this.vertices = [];

    /**
     * @property {Number[]} triangles Vertex indices
     */
    this.triangles = [];
    this.materials = [];

    this.metadata = {
      originalMaterialNames: [],
      originalGeometryNames: [],
      originalTexturePaths: [],
    };

    this.vertexFormat = null;

    this.isInvalid = false;
  }

  /**
   * @private
   */
  markInvalid() {
    this.isInvalid = true;
  }

  /**
   * @param {Buffer} data 
   */
  readData(data) {
    if (this.raw) throw new Error("Model already loaded!");
    this.raw = data;

    // Header
    if (data.subarray(0, 3).toString() !== "RDM") throw new Error("Invalid magic number!");
    if (data[3] != 0x01) return this.markInvalid(); // Unknown what this flag does. Is 0 for some files
    if (data.readUint32LE(0x0c) != 0x04) throw new Error("Something is different at this file (0x0c !=> 0x04)");
    if (data.readUint32LE(0x10) != 0x1c) throw new Error("Something is different at this file (0x10 !=> 0x1c)");

    this.validateBlocks();

    let geometryOffsets;
    this.readBlock(0x1C, buffer => {
      if (buffer.length != 48) throw new Error("Block has different size");
      
      // 0xC1 + 0x00
      this.readBlock(buffer.readUInt32LE(0x00), buffer => {
        if (buffer.length != 72) throw new Error("Block has different length");
        this.metadata.originalModelPath = this.readString(buffer.readUInt32LE(0));
        this.metadata.rmpPath = this.readString(buffer.readUInt32LE(4));
        if (!this.metadata.rmpPath.endsWith(".rmp")) throw new Error("Path does not end with .rmp!");
      });

      // 0xC1 + 0x04
      geometryOffsets = buffer.readUInt32LE(0x04);

      // 0xC1 + 0x08
      this.readBlock(buffer.readUInt32LE(0x08), buffer => {
        if (buffer.length != 28) throw new Error("Block has different size");

        // 0xC1 + 0x08 => 0x00
        this.readBlock(buffer.readUInt32LE(0x00), (buffer) => {
          if (buffer.length != 48) throw new Error("Block has different size"); 
  
          // Material name of original in editor?
          this.metadata.originalMaterialNames.push(this.readString(buffer.readUInt32LE(0)));
          this.metadata.originalTexturePaths.push(this.readString(buffer.readUInt32LE(4)));
        });
      });

      // 0xC1 + 0x0C
      this.readBlock(buffer.readUInt32LE(0x0C), buffer => {
        if (buffer.length != 32) throw new Error("Block has different size"); 

        // 0xC1 + 0x0C =>
        this.readBlock(buffer.readUInt32LE(0), buffer => {
          if (buffer.length != 84) throw new Error("Block has different size");
          
          // 0xC1 + 0x0C => +0x00 =>
          this.metadata.originalGeometryNames.push(
            this.readString(buffer.readUInt32LE(0))
          );
        });
      });
    });

    if (geometryOffsets == 0) return this.markInvalid();
    if (geometryOffsets < 32) throw new Error("Offsets offset to low.");

    // Offsets
    let offset0, offset1, offset2, offsetVertices, offsetTriangles, offsetMaterials;
    this.readBlock(geometryOffsets, buffer => {
      if (buffer.length != 92 && buffer.length != 68) throw new Error("Offsets block has wrong size!");
      offset0 =  buffer.readUInt32LE(0);
      offset1 =  buffer.readUInt32LE(4);
      offset2 =  buffer.readUInt32LE(8);
      offsetVertices =  buffer.readUInt32LE(12);
      offsetTriangles = buffer.readUInt32LE(16);
      offsetMaterials = buffer.readUInt32LE(20);
    });

    // Block 0
    this.readBlock(offset0, buffer => {
      if (buffer.length != 28) throw new Error("Block 0 length mismatch");
      this.metadata.objectName = this.readString(buffer.readUInt32LE(0));
    });

    // Block 1
    this.readBlock(offset1, buffer => {
      if (buffer.length != 24) throw new Error("Block 1 length mismatch");
    });

    // Block 2
    this.readBlock(offset2, buffer => {
      if (buffer.length != 20) throw new Error("Block 2 length mismatch!");
    });

    // Materials
    this.readBlock(offsetMaterials, buffer => {
      const material = new RDMMaterial(buffer, 0);
      this.materials.push(material);
    });

    // Vertices
    const vertexNumber = data.readUInt32LE(offsetVertices - 8);
    const vertexSize = data.readUInt32LE(offsetVertices - 4);
    this.vertexFormat = VertexFormat.getBySize(vertexSize);
    for (let i = 0; i < vertexNumber; i++) {
      const offset = offsetVertices + i * vertexSize;
      const vertex = this.vertexFormat.read(data.slice(offset, offset + vertexSize));
      this.vertices.push(vertex);
    }

    // Triangles
    const triangleNumber = data.readUInt32LE(offsetTriangles - 8) / 3;
    const triangleSize = data.readUInt32LE(offsetTriangles - 4); // Size per index in bytes

    for (let i = 0; i < triangleNumber; i++) {
      const offset = offsetTriangles + i * 3 * triangleSize;

      if (triangleSize == 4) {
        this.triangles.push([
          data.readUInt32LE(offset),
          data.readUInt32LE(offset + 2),
          data.readUInt32LE(offset + 4)
        ]);
      } else if (triangleSize == 2) {
        this.triangles.push([
          data.readUInt16LE(offset),
          data.readUInt16LE(offset + 2),
          data.readUInt16LE(offset + 4)
        ]);
      } else {
        throw new Error("Unsupported triangle size: " + triangleSize);
      }
    }

    this.validateTriangles();
  }

  // Helper functions bound to the current file buffer
  readBlock(offset, callback) {
    if (offset == 0) return;
    const entryNumber = this.raw.readUint32LE(offset - 8);
    const entrySize = this.raw.readUint32LE(offset - 4);
    for (let i = 0; i < entryNumber; i++) {
      callback(this.raw.subarray(offset + i * entrySize, offset + (i + 1) * entrySize), i);
    }
  }

  readString(offset) {
    if (offset == 0) return "";
    const entryNumber = this.raw.readUint32LE(offset - 8);
    const entrySize = this.raw.readUint32LE(offset - 4);
    return this.raw.subarray(offset, offset + entryNumber * entrySize).toString("utf8");
  }

  validateTriangles() {
    if (this.raw == null) throw new Error("Model not loaded!");

    for (let triangle of this.triangles) {
      for (let index of triangle) {
        if (index >= this.vertices.length) {
          throw new Error("Invalid vertex index");
        }
      }
    }
    return true;
  }

  validateBlocks() {
    if (this.raw == null) throw new Error("Model not loaded!");

    let offsets = [];
    let offset = 0x14;

    while (offset < this.raw.length) {
      offsets.push(offset);

      const count = this.raw.readUint32LE(offset);
      const size = this.raw.readUint32LE(offset + 4);
      offset += 8 + count * size;
    }
    return true;
  }

  /**
   * @returns {string} OBJ string
   */
  exportOBJ(mtllib = null) {
    if (this.raw == null) throw new Error("Model not loaded!");

    let out = "# Generated by RDMReader\n";
    if (mtllib) {
      out += `mtllib ${mtllib}\n`;
    }
    out += "usemtl mat_0\n";

    /// === Vertices ===
    // Positions
    for (let vertex of this.vertices) {
      out += `v ${vertex.position[0]} ${vertex.position[1]} ${vertex.position[2]}\n`;
    }

    // Normals
    if (this.vertexFormat.hasAttribute("normal")) {
      for (let vertex of this.vertices) {
        out += `vn ${vertex.normal[0]} ${vertex.normal[1]} ${vertex.normal[2]}\n`;
      }
    }

    // Texture coordinates
    if (this.vertexFormat.hasAttribute("texcoord")) {
      for (let vertex of this.vertices) {
        out += `vt ${vertex.texcoord[0]} ${vertex.texcoord[1]}\n`;
      }
    }

    /// === Faces ===
    // Triangles
    for (let triangle of this.triangles) {
      // Obj index starts at 1
      const i1 = triangle[0] + 1;
      const i2 = triangle[1] + 1;
      const i3 = triangle[2] + 1;
      out += `f ${i1}/${i1}/${i1} ${i2}/${i2}/${i2} ${i3}/${i3}/${i3}\n`;
    }

    return out;
  }

  exportMTL() {
    let out = "";
    for (let material of this.materials) {
      out += material.toMTL() + "\n";
    }
    return out;
  }

  writeData() {
    const blocks = [];
    const header = Buffer.alloc(0x14);
    header.write("RDM", 0);
    header[0x03] = 0x01;
    header[0x04] = 0x14;
    header[0x0C] = 0x04;
    header[0x10] = 0x1C;

    const block0 = Buffer.alloc(0x30);
    block0.writeUInt32LE(0x54, 0x00); // offset to filenames
    block0.writeUInt32LE(0xff, 0x04); // offset to geometry offsets
    blocks.push({num: 1, content: block0});

    for (const block of blocks) {
      const blockIndex = Buffer.alloc(8);
      blockIndex.writeUInt32LE(block.num, 0);
      blockIndex.writeUInt32LE(block.content.length, 4);

      
    }
  }
}

class RDMMaterial {
  constructor(data, offset) {
    this.offset = data.readUInt32LE(offset);
    this.size = data.readUInt32LE(offset + 4);
    this.index = data.readUInt32LE(offset + 8);

    this.ambientColor = [0.5, 0.5, 0.5, 1];
    this.diffuseColor = [1, 1, 1, 1];
    this.specularColor = [0, 0, 0, 1];
    this.emissiveColor = [0, 0, 0, 1];

    this.diffuseMap = null;
    this.specularMap = null;
    this.enviromentMap = null;
    this.shaderIndex = 0;
  }

  toMTL() {
    let out = "";

    out += `newmtl mat_${this.index}\n`;
    out += `Ka ${this.ambientColor[0]} ${this.ambientColor[1]} ${this.ambientColor[2]}\n`;
    out += `Kd ${this.diffuseColor[0]} ${this.diffuseColor[1]} ${this.diffuseColor[2]}\n`;
    out += `Ks ${this.specularColor[0]} ${this.specularColor[1]} ${this.specularColor[2]}\n`;
    out += `Ke ${this.emissiveColor[0]} ${this.emissiveColor[1]} ${this.emissiveColor[2]}\n`;

    if (this.diffuseMap) {
      out += `map_Kd ${this.diffuseMap}\n`;
    }

    if (this.specularMap) {
      out += `map_Ks ${this.specularMap}\n`;
    }

    if (this.enviromentMap) {
      out += `map_bump ${this.enviromentMap}\n`;
    }

    return out;
  }
}