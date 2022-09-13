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
  get sendExplorationMessage() {
    if (!this.xml) throw new Error("No data in Island");
    return Boolean(this.xml.getInlineContent("SendExplorationMessage"));
  }

  /**
   * @param {bool} value
   */
  set sendExplorationMessage(value) {
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
    return targetChunk.getHeightAtIslandPosition(x, y);
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
    targetChunk.setHeightAtIslandPosition();

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
    for (let chunk of chunks) chunk.clearHeight(height);
  }

  clearTerrainTextureWeights(weights) {
    const chunks = this.getAllChunks();
    for (let chunk of chunks) chunk.clearTextureWeights(weights);
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
  }

  validate() {
    const chunks = this.getAllChunks();
    for (const chunk of chunks) {
      chunk.validate();
    }
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

  // ============================ HEIGHT ===============================
  /**
   * Gets the height of a point on the island
   * @param {Number} islandX X-Position of the vertex relative to the island
   * @param {Number} islandY Y-Position of the vertex relative to the island
   * @returns {Number} Height at that point
   */
  getHeightAtIslandPosition(islandX, islandY) {
    const localX = islandX - this.positionX;
    const localY = islandY - this.positionY;
    return this.getHeightAtLocalPosition(localX, localY);
  }

  /**
   * Gets the height of a vertex in the chunk
   * @param {Number} chunkX X-Position of the vertex relative to this chunk
   * @param {Number} chunkY Y-Position of the vertex relative to this chunk
   * @returns {Number} Height at that point
   */
  getHeightAtLocalPosition(chunkX, chunkY) {
    const heightData = this.getHeightData();
    if (!heightData) return -40;

    const gridSize = this.heightMapWidth - 1;
    const cellWidth = ISDAsset.CHUNK_SIZE / gridSize;;
    chunkX /= cellWidth;
    chunkY /= cellWidth;

    if (chunkX < 0 || chunkY < 0) throw new Error("Position outside of chunk");
    if (chunkX > this.heightMapWidth || chunkY > this.heightMapWidth) throw new Error("Position outside of chunk");
    const tileIndex = chunkX + chunkY * this.heightMapWidth;
    return heightData.readFloatLE(tileIndex * 4);
  }

  /**
   * Sets the height of a point on the island
   * @param {Number} islandX X-Position of the vertex relative to the island
   * @param {Number} islandY Y-Position of the vertex relative to the island
   * @param {Number} height to set to
   */
   setHeightAtIslandPosition(islandX, islandY, height) {
    const localX = islandX - this.positionX;
    const localY = islandY - this.positionY;
    return this.setHeightAtLocalPosition(localX, localY, height);
  }

  /**
   * Sets the height of a vertex on this island.
   * @param {Number} chunkX X-Position of the vertex relative to this chunk
   * @param {Number} chunkY Y-Position of the vertex relative to this chunk
   * @param {Number} height Height to set that vertex to
   */
  setHeightAtLocalPosition(chunkX, chunkY, height) {
    const heightData = this.getHeightData();
    if (!heightData) return;

    const gridSize = this.heightMapWidth - 1;
    const cellWidth = ISDAsset.CHUNK_SIZE / gridSize;
    chunkX /= cellWidth;
    chunkY /= cellWidth;

    const tileIndex = chunkX + chunkY * this.heightMapWidth;
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

   /// ================ TEXTURE ==================================
   getTextureWeightsAtPosition(chunkX, chunkY) {
    const layers = this.xml.getChildrenOfType("TexIndexData");
    const out = {};
    for (const layer of layers) {
      const texLayer = new TextureLayer(layer);
      out[texLayer.index] = texLayer.getWeight(chunkX, chunkY)
    }
    return out;
  }

  setTextureWeightsAtPosition(chunkX, chunkY, textureIndex, weight) {
    const layers = this.xml.getChildrenOfType("TexIndexData");
    const textureLayers = layers.map(xml => new TextureLayer(xml));
    
    let targetLayer = textureLayers.find(layer => layer.index == textureIndex);
    if (!targetLayer) {
      targetLayer = this.generateTextureLayer(textureIndex);
    }
    targetLayer.setWeight(chunkX, chunkY, weight);
  }

  clearTextureWeights(weights) {
    if (this.vertexResolution < 0) return; // -1 for chunks without surface

    const layers = this.xml.getChildrenOfType("TexIndexData");
    for (const layer of layers) {
      this.xml.removeChild(layer);
    }

    for (const index in weights) {
      const value = weights[index];
      const layer = this.generateTextureLayer(index);
      layer.clear(value);
    }
  }

  cleanupTextureWeights() {
    const layers = this.xml.getChildrenOfType("TexIndexData");
    for (const layer of layers) {
      const texLayer = new TextureLayer(layer);
      if (texLayer.isZero()) {
        this.xml.removeChild(layer);
      }
    }
  }

  generateTextureLayer(index) {
    const layer = TextureLayer.Generate(index, (1 << this.vertexResolution) + 1)
    this.xml.addChild(layer.xml);
    return layer;
  }

  /// ===================== EXPORT ============================
  /**
   * @param {OBJ} obj 
   */
  buildToObj(obj) {
    const heightData = this.getHeightData();
    if (!heightData) return;

    const gridSize = this.heightMapWidth - 1;
    const cellWidth = ISDAsset.CHUNK_SIZE / gridSize;

    const verticesPerSide = gridSize + 1;

    const vertices = [];
    for (let x = 0; x < verticesPerSide; x++) {
      for (let y = 0; y < verticesPerSide; y++) {
        vertices.push(
          obj.addVertex(this.positionX + x * cellWidth, this.getHeightAtLocalPosition(x * cellWidth, y * cellWidth), this.positionY + y * cellWidth)
        );
      }
    }

    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        obj.addFace(
          vertices[x + y * verticesPerSide],
          vertices[(x + 1) + y * verticesPerSide],
          vertices[x + (y + 1) * verticesPerSide]
        );

        obj.addFace(
          vertices[(x + 1) + y * verticesPerSide],
          vertices[(x + 1) + (y + 1) * verticesPerSide],
          vertices[x + (y + 1) * verticesPerSide],
        );
      }
    }
  }

  validate() {
    const mapWidth = this.heightMapWidth;
    if (mapWidth < 0) return true;

    const layers = this.xml.getChildrenOfType("TexIndexData");
    for (const layer of layers) {
      const texLayer = new TextureLayer(layer);
      if (texLayer.width != mapWidth) throw new Error("Texture and height map are not in same scale!!!");
    }
  }
}

class TextureLayer {

  constructor(xml) {
    this.xml = xml;
  }

  get index() {
    return this.xml.getInlineContent("TextureIndex");
  }

  set index(value) {
    this.xml.setInlineContent("TextureIndex", value);
  }

  get width() {
    return this.xml.findChild("AlphaMap").getInlineContent("Width");
  }

  getWeight(x, y) {
    const alphaMap = this.xml.findChild("AlphaMap");

    const alphaMapWidth = alphaMap.getInlineContent("Width");
    const localX = x * (ISDAsset.CHUNK_SIZE / (alphaMapWidth - 1));
    const localY = y * (ISDAsset.CHUNK_SIZE / (alphaMapWidth - 1));

    const alphaMapContent = alphaMap.getInlineContent("Data");
    return alphaMapContent[localX + localY * alphaMapWidth] / 255;
  }

  setWeight(x, y, weight) {
    const alphaMap = this.xml.findChild("AlphaMap");

    const alphaMapWidth = alphaMap.getInlineContent("Width");
    const localX = x * (ISDAsset.CHUNK_SIZE / (alphaMapWidth - 1));
    const localY = y * (ISDAsset.CHUNK_SIZE / (alphaMapWidth - 1));

    const alphaMapContent = alphaMap.getInlineContent("data");
    alphaMapContent[localX + localY * alphaMapWidth] = Math.floor(weight * 255);
  }

  clear(value) {
    const alphaMap = this.xml.findChild("AlphaMap");
    const alphaMapContent = alphaMap.getInlineContent("data");
    alphaMapContent.fill(Math.floor(value * 255));
  }

  isZero() {
    const alphaMap = this.xml.findChild("AlphaMap");
    
    /**
     * @type {Buffer}
     */
    const alphaMapContent = alphaMap.getInlineContent("data");
    return !alphaMapContent.some((value, index, uint8) => value > 0);
  }

  static Generate(index, size) {
    const xml = new XMLElement("TexIndexData");
    xml.setInlineContent("TextureIndex", index);
    const alphaMap = new XMLElement("AlphaMap");
    alphaMap.setInlineContent(size, "Width");
    alphaMap.setInlineContent(Buffer.alloc(size * size), "Data");
    xml.addChild(alphaMap);
    return new TextureLayer(xml);
  }
}