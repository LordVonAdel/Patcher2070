import OBJ from "../Common/OBJ.js";
import XMLAsset from "../Common/XMLAsset.js";
import { XMLElement } from "../Common/XMLParser.js";

/**
 * ISD files store data about island presets. All islands in Anno are premade and placed into the game world.
 */
export default class ISDAsset extends XMLAsset {

  constructor() {
    super();
  }

  readData(data) {
    super.readData(data);

    // Sanity checky
    const usedChunks = this.xml.findChild("UsedChunks");
    const xSize = usedChunks.getInlineContent("m_XSize");
    const ySize = usedChunks.getInlineContent("m_YSize");
    if (this.width / xSize != ISDAsset.CHUNK_SIZE || this.height / ySize != ISDAsset.CHUNK_SIZE) throw new Error("Chunk bitmap / Island size mismatch");

    const terrain = this.xml.findChild("Terrain");
    const chunkMap = terrain.findChild("ChunkMap");
    const chunkMapX = chunkMap.getInlineContent("Width");
    const chunkMapY = chunkMap.getInlineContent("Height");
    if (xSize != chunkMapX || ySize != chunkMapY) throw new Error("Terrain ChunkMap does not match usedChunks BitGrid");
  }

  /**
   * Width of the island in tiles (X-Axis)
   * @returns {number}
   */
  get width() {
    if (!this.xml) throw new Error("No data in Island");
    return Number(this.xml.getInlineContent("Width"));
  }

  /**
   * Height of the island in tiles (Z-Axis)
   * @returns {number}
   */
  get height() {
    if (!this.xml) throw new Error("No data in Island");
    return Number(this.xml.getInlineContent("Height"));
  }

  get clime() {
    return Number(this.xml.getInlineContent("Clime"));
  }

  get difficulty() {
    return Number(this.xml.getInlineContent("Difficulty"));
  }

  /**
   * @returns {bool}
   */
  get SendExplorationMessage() {
    if (!this.xml) throw new Error("No data in Island");
    return Boolean(this.xml.getInlineContent("SendExplorationMessage"));
  }

  /**
   * @param {bool} ShowExplorationMessage
   */
  set SendExplorationMessage(value) {
    if (!this.xml) throw new Error("No data in Island");
    this.xml.setInlineContent(value ? 1 : 0, "SendExplorationMessage");
  }

  static CHUNK_SIZE = 16;

  /**
   * @param {Number} x 
   * @param {Number} y (Z-Position in ingame coordinates)
   * @returns Height of the cell
   */
  getTerrainHeightAtLocation(x, y) {
    if (!this.xml) throw new Error("No data in Island");
    const targetChunk = this.getChunkAtLocation(x, y);
    return targetChunk.getHeightAtIslandCell(x, y);
  }

  /**
   * @param {Number} x 
   * @param {Number} y 
   * @param {Number} height 
   * @returns 
   */
  setTerrainHeightAtLocation(x, y, height) {
    if (!this.xml) throw new Error("No data in Island");
    const targetChunk = this.getChunkAtLocation(x, y);
    targetChunk.setHeightAtIslandCell();

    const heightMap = targetChunk.findChild("HeightMap");
    if (!heightMap) return;
    const width = +heightMap.getInlineContent("Width");
    const localX = Math.floor(x % ISDAsset.CHUNK_SIZE);
    const localY = Math.floor(y % ISDAsset.CHUNK_SIZE);

    /**
     * @type {Buffer}
     */
    const heightBuffer = heightMap.getInlineContent("Data");
    if (!heightBuffer) return;
    const tileIndex = localX + localY * width;
    heightBuffer.writeFloatLE(height, tileIndex * 4);
  }

  clearTerrainHeight(height) {
    const chunks = this.getAllChunks();
    for (let chunk of chunks) chunk.clearHeight(height)
  }

  /**
   * @returns {IslandChunk[]} chunks
   */
  getAllChunks() {
    const terrainNode = this.xml.findChild("Terrain");
    const chunkMap = terrainNode.findChild("ChunkMap");
    const chunksW = +chunkMap.getInlineContent("Width");
    const chunks = chunkMap.getChildrenOfType("Element");

    const out = [];
    for (let i = 0; i < chunks.length; i++) {
      out.push(new IslandChunk(
        i % chunksW,
        Math.floor(i / chunksW),
        chunks[i]
      ));
    }
    return out;
  }

  /**
   * @private
   * @returns {IslandChunk}
   */
  getChunkAtLocation(x, y) {
    if (!this.xml) throw new Error("No data in Island");

    const terrainNode = this.xml.findChild("Terrain");
    const tilesW = +terrainNode.getInlineContent("TileCountX");
    const tilesH = +terrainNode.getInlineContent("TileCountZ");

    const chunkMap = terrainNode.findChild("ChunkMap");
    const chunksW = +chunkMap.getInlineContent("Width");
    const chunks = chunkMap.getChildrenOfType("Element");

    const chunkWidth = tilesW / chunksW;
    const chunkHeight = tilesH / chunksW;

    const chunkIndexX = Math.floor(x / chunkWidth);
    const chunkIndexY = Math.floor(y / chunkHeight);
    const chunkIndex = chunkIndexX + chunkIndexY * chunksW;

    return new IslandChunk(chunkIndexX, chunkIndexY, chunks[chunkIndex]);
  }

  /**
   * Generates an OBJ file of the island terrain
   * @returns {string} obj file content
   */
  exportAsOBJ() {
    if (!this.xml) throw new Error("No data in Island");

    const obj = new OBJ();
    const chunks = this.getAllChunks();
    for (let chunk of chunks) {
      chunk.buildToObj(obj);
    }
    return obj.toFile();

    let out = "# Generated by Anno2070js\n";
    out += "o Island\n";

    /// === Vertices ===
    // @todo This can be optimized! Number of vertices reduced by a factor of 4 by sharing corners.
    for (let y = 0; y < this.height - 1; y++) {
      for (let x = 0; x < this.width - 1; x++) {
        out += `v ${x} ${  this.getTerrainHeightAtLocation(x,   y).toFixed(4)  } ${y}\n`;
        out += `v ${x+1} ${this.getTerrainHeightAtLocation(x+1, y).toFixed(4)  } ${y}\n`;
        out += `v ${x} ${  this.getTerrainHeightAtLocation(x,   y+1).toFixed(4)} ${y+1}\n`;
        out += `v ${x+1} ${this.getTerrainHeightAtLocation(x+1, y+1).toFixed(4)} ${y+1}\n`;
      }
    }


    /// === Faces ===
    const cells = (this.width - 1) * (this.height - 1)
    let index = 1;
    for (let i = 0; i < cells; i++) {
      out += `f ${index    } ${index + 1} ${index + 2}\n`;
      out += `f ${index + 1} ${index + 2} ${index + 3}\n`;
      index += 4;
    }

    return out;
  }
}

class IslandChunk {
  constructor(chunkIndexX, chunkIndexY, xml) {

    /**
     * @type {XMLElement}
     */
    this.xml = xml;

    /**
     * @type {Number}
     */
    this.chunkIndexX = chunkIndexX;

    /**
     * @type {Number}
     */
    this.chunkIndexY = chunkIndexY;
  }

  get positionX() { return this.chunkIndexX * ISDAsset.CHUNK_SIZE; }
  get positionY() { return this.chunkIndexY * ISDAsset.CHUNK_SIZE; }

  /**
   * Gets the height of a point on the island
   * @param {Number} islandX X-Position of the cell relative to the island
   * @param {Number} islandY Y-Position of the cell relative to the island
   * @returns {Number} Height at that point
   */
  getHeightAtIslandCell(islandX, islandY) {
    const localX = islandX - this.positionX;
    const localY = islandY - this.positionY;
    return this.getHeightAtLocalCell(localX, localY);
  }

  /**
   * Gets the height of a vertex in the chunk
   * @param {Number} cellX X-Position of the cell relative to this chunk
   * @param {Number} cellY Y-Position of the cell relative to this chunk
   * @returns {Number} Height at that point
   */
  getHeightAtLocalCell(cellX, cellY) {
    const heightData = this.getHeightData();
    if (!heightData) return -40;

    if (cellX < 0 || cellY < 0) throw new Error("Position outside of chunk");
    if (cellX > this.heightMapWidth || cellY > this.heightMapWidth) throw new Error("Position outside of chunk");
    const tileIndex = cellX + cellY * this.heightMapWidth;
    return heightData.readFloatLE(tileIndex * 4);
  }

  /**
   * Sets the height of a point on the island
   * @param {Number} islandX X-Position of the cell relative to the island
   * @param {Number} islandY Y-Position of the cell relative to the island
   * @param {Number} height to set to
   */
   setHeightAtIslandCell(islandX, islandY, height) {
    const localX = islandX - this.positionX;
    const localY = islandY - this.positionY;
    return this.setHeightAtLocalCell(localX, localY, height);
  }

  /**
   * Sets the height of a vertex on this island.
   * @param {Number} cellX X-Position of the cell relative to this chunk
   * @param {Number} cellY Y-Position of the cell relative to this chunk
   * @param {Number} height Height to set that cell to
   */
  setHeightAtLocalCell(cellX, cellY, height) {
    const heightData = this.getHeightData();
    if (!heightData) return;

    const tileIndex = cellX + cellY * this.heightMapWidth;
    return heightData.writeFloatLE(height, tileIndex * 4);
  }

  clearHeight(height) {
    const heightData = this.getHeightData();
    if (!heightData) return;

    for (let i = 0; i < this.heightMapWidth * this.heightMapWidth; i++) {
      heightData.writeFloatLE(height, i * 4);
    }
  }

  /**
   * @returns {Buffer}
   */
  getHeightData() {
    const heightMap = this.xml.findChild("HeightMap");
    if (!heightMap) return null;
    const heightData = heightMap.getInlineContent("Data");
    if (!heightData) return null;
    return heightData;
  }

  get heightMapWidth() {
    const heightMap = this.xml.findChild("HeightMap");
    if (!heightMap) return -1;
    return Number(heightMap.getInlineContent("Width"));
  }

  get vertexResolution() {
    return Number(this.xml.getInlineContent("VertexResolution"));
  }

  generateHeightMap(resolution) {
    const heightMap = this.xml.findChild("HeightMap");
    heightMap.setInlineContent(resolution, "VertexResolution");
    heightMap.setInlineContent(Math.pow(2, resolution) + 1, "Width");
    const buff = Buffer.alloc(this.heightMapWidth * this.heightMapWidth * 4);
    heightMap.setInlineContent(buff, "Data");
  }

  /**
   * @param {OBJ} obj 
   */
  buildToObj(obj) {
    const heightData = this.getHeightData();
    if (!heightData) return;

    const gridSize = this.heightMapWidth - 1;
    const cellWidth = ISDAsset.CHUNK_SIZE / gridSize;
    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        const v0 = obj.addVertex(this.positionX + x * cellWidth, this.getHeightAtLocalCell(x, y), this.positionY + y * cellWidth);
        const v1 = obj.addVertex(this.positionX + (x + 1) * cellWidth, this.getHeightAtLocalCell(x + 1, y), this.positionY + y * cellWidth);
        const v2 = obj.addVertex(this.positionX + x * cellWidth, this.getHeightAtLocalCell(x, y + 1), this.positionY + (y + 1) * cellWidth);
        const v3 = obj.addVertex(this.positionX + (x + 1) * cellWidth, this.getHeightAtLocalCell(x + 1, y + 1), this.positionY + (y + 1) * cellWidth);
        
        obj.addFace(v0, v1, v2);
        obj.addFace(v1, v3, v2);
      }
    }
  }
}