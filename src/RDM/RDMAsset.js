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

      // 0x1C + 0x00
      this.readBlock(buffer.readUInt32LE(0x00), buffer => {
        if (buffer.length != 72) throw new Error("Block has different length");
        this.metadata.originalModelPath = this.readString(buffer.readUInt32LE(0));
        this.metadata.rmpPath = this.readString(buffer.readUInt32LE(4));
        if (!this.metadata.rmpPath.endsWith(".rmp")) throw new Error("Path does not end with .rmp!");
      });

      // 0x1C + 0x04
      geometryOffsets = buffer.readUInt32LE(0x04);

      // 0x1C + 0x08
      this.readBlock(buffer.readUInt32LE(0x08), buffer => {
        if (buffer.length != 28) throw new Error("Block has different size");

        // 0x1C + 0x08 => 0x00
        this.readBlock(buffer.readUInt32LE(0x00), (buffer) => {
          if (buffer.length != 48) throw new Error("Block has different size");

          // Material name of original in editor?
          this.metadata.originalMaterialNames.push(this.readString(buffer.readUInt32LE(0)));
          this.metadata.originalTexturePaths.push(this.readString(buffer.readUInt32LE(4)));
        });
      });

      // 0x1C + 0x0C
      this.readBlock(buffer.readUInt32LE(0x0C), buffer => {
        if (buffer.length != 32) throw new Error("Block has different size");

        // 0x1C + 0x0C =>
        this.readBlock(buffer.readUInt32LE(0), buffer => {
          if (buffer.length != 84) throw new Error("Block has different size");

          // 0x1C + 0x0C => +0x00 =>
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
      offset0 = buffer.readUInt32LE(0);
      offset1 = buffer.readUInt32LE(4);
      offset2 = buffer.readUInt32LE(8);
      offsetVertices = buffer.readUInt32LE(12);
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
      const material = new RDMMaterial();
      material.fromBuffer(buffer, 0);
      this.materials.push(material);
    });

    // Vertices
    const vertexNumber = data.readUInt32LE(offsetVertices - 8);
    const vertexSize = data.readUInt32LE(offsetVertices - 4);
    this.vertexFormat = VertexFormat.getBySize(vertexSize);
    for (let i = 0; i < vertexNumber; i++) {
      const offset = offsetVertices + i * vertexSize;
      const vertex = this.vertexFormat.read(data.subarray(offset, offset + vertexSize));
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
          data.readUInt32LE(offset + 4),
          data.readUInt32LE(offset + 8)
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

  /**
   * Fills this Model with data from OBJ Formatted data
   * @param {string} obj OBJ Formatted text
   */
  importOBJ(obj) {
    this.triangles.length = 0;
    this.vertices.length = 0;
    this.vertexFormat = VertexFormat.getBySize(20);

    const lines = obj.split("\n");
    const uvs = [];
    const normals = [];
    const positions = [];

    for (let line of lines) {
      const parts = line.split(" ");
      if (parts[0] == "v") positions.push([+parts[1], +parts[2], +parts[3]]);
      if (parts[0] == "vn") normals.push([+parts[1], +parts[2], +parts[3]]);
      if (parts[0] == "vt") uvs.push([+parts[1], +parts[2]]);
      if (parts[0] == "f") {
        for (let i = 1; i < parts.length; i++) {
          const part = parts[i];
          const indices = part.split("/");
          this.vertices.push({position: positions[+indices[0] - 1], texcoord: uvs[+indices[1] - 1], normal: normals[+indices[2] - 1]});
        }
        this.triangles.push([this.vertices.length - 3, this.vertices.length - 2, this.vertices.length - 1]);
        if (parts.length == 5) { // Is quad?
          this.triangles.push([this.vertices.length - 4, this.vertices.length - 3, this.vertices.length - 1]);
        }
      }
    }

    // Just always use Position, Normal, Texcoord, Unknown when encoding custom model
    this.vertexFormat = VertexFormat.getBySize(20);
  }

  /**
   * @returns {Buffer}
   */
  writeData() {
    let writeHead = 0;

    /**
     * @type {Buffer[]}
     */
    const buffers = [];

    function allocateBlock(count, size, generateHead = true) {
      if (generateHead) {
        const bufferHead = Buffer.alloc(8);
        writeHead += bufferHead.length;
        bufferHead.writeUInt32LE(count, 0);
        bufferHead.writeUInt32LE(size, 4);
        buffers.push(bufferHead);
      }
      const globalOffset = writeHead;

      const bufferContent = Buffer.alloc(count * size);
      writeHead += bufferContent.length;
      buffers.push(bufferContent);
      return {buffer: bufferContent, offset: globalOffset};
    }

    function allocateString(value) {
      const buffer = Buffer.from(value, "utf8");
      writeHead += buffer.length;
      buffers.push(buffer);
      return writeHead - buffer.length;
    }

    // Header
    const header = allocateBlock(1, 0x14, false);
    header.buffer.write("RDM", 0);
    header.buffer[0x03] = 0x01;
    header.buffer[0x04] = 0x14;
    header.buffer[0x0C] = 0x04;
    header.buffer[0x10] = 0x1C;

    const header2 = allocateBlock(1, 0x30, true);

    // (0x1C + 0x00)
    const header3 = allocateBlock(1, 0x48, true);
    header2.buffer.writeUInt32LE(header3.offset, 0x00);

    const offsetsBlock = allocateBlock(1, 48, true);
    header2.buffer.writeUInt32LE(offsetsBlock.offset, 0x04);

    const block0 = allocateBlock(1, 28, true);
    const block1 = allocateBlock(1, 24, true);
    const block2 = allocateBlock(1, 20, true);

    const blockVertices = allocateBlock(this.vertices.length, this.vertexFormat.size);
    const blockTriangles = allocateBlock(this.triangles.length, 12);
    const blockMaterials = allocateBlock(this.materials.length, 12);

    offsetsBlock.buffer.writeUInt32LE(block0.offset, 0); // offsets 0
    offsetsBlock.buffer.writeUInt32LE(block1.offset, 4); // offsets 1
    offsetsBlock.buffer.writeUInt32LE(block2.offset, 8); // offsets 2
    offsetsBlock.buffer.writeInt32LE(blockVertices.offset, 12);
    offsetsBlock.buffer.writeInt32LE(blockTriangles, 16);
    offsetsBlock.buffer.writeInt32LE(blockMaterials, 20);

    for (let i = 0; i < this.triangles.length; i++) {
      blockTriangles.buffer.writeUInt32LE(this.triangles[i][0], i * 12);
      blockTriangles.buffer.writeUInt32LE(this.triangles[i][1], i * 12 + 4);
      blockTriangles.buffer.writeUInt32LE(this.triangles[i][2], i * 12 + 8);
    }

    for (let i = 0; i < this.vertices.length; i++) {
      const vert = this.vertices[i];
      this.vertexFormat.write(blockVertices.buffer, vert, i * this.vertexFormat.size);
    }

    header3.buffer.writeUInt32LE(allocateString(this.metadata.originalModelPath), 0);

    return Buffer.concat(buffers);
  }

}

class RDMMaterial {
  constructor() {
    this.offset = 0;
    this.size = 0;
    this.index = 0;

    this.ambientColor = [0.5, 0.5, 0.5, 1];
    this.diffuseColor = [1, 1, 1, 1];
    this.specularColor = [0, 0, 0, 1];
    this.emissiveColor = [0, 0, 0, 1];

    this.diffuseMap = null;
    this.specularMap = null;
    this.enviromentMap = null;
    this.shaderIndex = 0;
  }

  fromBuffer(data, offset) {
    this.offset = data.readUInt32LE(offset);
    this.size = data.readUInt32LE(offset + 4);
    this.index = data.readUInt32LE(offset + 8);
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
