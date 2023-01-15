import OBJ from "../Common/OBJ.js";
import XMLAsset from "../Common/XMLAsset.js";
import { XMLElement } from "../Common/XMLParser.js";
import DDSAsset from "../DDS/DDSAsset.js";

/**
 * ISD files store data about island presets. All islands in Anno are premade and placed into the game world.
 * 
 * Nothing can be build on terrain under the height of 0.7 units.
 * 
 * Island can't be larger than 512 x 512 because of how the UsedChunks BitGrid is stored. 
 * 
 * 
 * Directions:
 * -1: X-
 *  0: Z- 
 *  1: X+
 *  2: Z+
 */

export default class ISDAsset extends XMLAsset {

  static DIRECTION_MULTIPLIER = 368640;

  constructor() {
    super();

    /**
     * @private
     * @type {number}
     */
    this._nextObjectId = -1;
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

    this.validate();
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

  set clime(value) {
    this.xml.setInlineContent(value, "Clime");
  } 

  get difficulty() {
    return Number(this.xml.getInlineContent("Difficulty"));
  }

  set difficulty(value) {
    this.xml.setInlineContent(value, "Difficulty");
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

  /**
   * IDK what this value influences
   */
  get seaLevel() {
    if (!this.xml) throw new Error("No data in Island");
    return +this.xml.getInlineContent("SeaLevel");
  }

  set seaLevel(value) {
    if (!this.xml) throw new Error("No data in Island");
    this.xml.setInlineContent(+value, "SeaLevel");
  }

  /**
   * Number of cells on the side of a chunk. Chunks are square so total number of cells in a chunk: 16 * 16 = 256
   */
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
    targetChunk.setHeightAtIslandPosition(x, y, height);
  }

  /**
   * Sets the height for all vertices of the island
   * @param {Number} height 
   */
  clearTerrainHeight(height) {
    const chunks = this.getAllChunks();
    for (let chunk of chunks) chunk.clearHeight(height);
  }

  /**
   * Applies a heightmap onto the terrain
   * @param {DDSAsset} map 
   */
  setTerrainFromHeightmap(map, whiteLevel, blackLevel) {
    const range = whiteLevel - blackLevel;

    const chunks = this.getAllChunks();
    for (let chunk of chunks) {
      const localMapSize = chunk.heightMapWidth;
      const buffer = Buffer.alloc(localMapSize * localMapSize * 4);

      for (let x = 0; x < localMapSize; x++) {
        for (let y = 0; y < localMapSize; y++) {
          const globalX = chunk.positionX + (x / localMapSize) * ISDAsset.CHUNK_SIZE;
          const globalY = chunk.positionY + (y / localMapSize) * ISDAsset.CHUNK_SIZE;
          const index = y * localMapSize + x;
          const value = map.sample(globalX / map.width, globalY / map.height).r;
          buffer.writeFloatLE(blackLevel + value * range, index * 4);
        }
      }

      chunk.setHeightData(buffer);
    }
  }

  /**
   * Sets the texture weights for all vertices of the island
   * @param {TextureWeights} weights 
   */
  clearTerrainTextureWeights(weights) {
    const chunks = this.getAllChunks();
    for (let chunk of chunks) chunk.clearTextureWeights(weights);
  }

  /**
   * Gets the texture weights at a position on the island
   * @param {number} x X Position
   * @param {number} y Y Position
   * @returns {TextureWeights}
   */
  getTextureWeightsAtLocation(x, y) {
    const chunk = this.getChunkAtLocation(x, y);
    return chunk.getTextureWeightsAtPosition(x - chunk.positionX, y - chunk.positionY);
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
   * Gets all objects on the island
   * @returns {IslandObject[]}
   */
  getAllObjects() {
    const gopManager = this.xml.findChild("m_GOPManager");
    const objectsGroup = gopManager.findChild("Objects");

    const out = [];

    for (const group of objectsGroup.content) {
      const objectType = group.name;
      const objectsInGroup = group.findChild("Objects").getChildrenOfType("Object");
      for (const obj of objectsInGroup) {
        out.push(
          new IslandObject(obj, objectType)
        );
      }
    }

    return out;
  }

  /**
   * Creates an object and adds it to the island
   * @param {"Handle"|"Feedback"|"Simple"|"Nature"|"Grass"} type Type of the object
   * @returns {IslandObject}
   */
  createObject(type) {
    if (this._nextObjectId == -1) {
      this._nextObjectId = this.getAllObjects().reduce((acc, curr) => Math.max(acc, curr), 0) + 1;
    }

    const object = IslandObject.Generate(type);
    this.xml.findChild("m_GOPManager").findChild("objects").findChild(type).findChild("Objects").addChild(object.xml);
    object.id = this._nextObjectId++;
    return object;
  }

  removeObject(object) {
    this.xml.findChild("m_GOPManager").findChild("objects").findChild(object.type).findChild("Objects").removeChild(object.xml);
  }

  clearObjects() {
    const objects = this.getAllObjects();
    for (const object of objects) {
      this.removeObject(object);
    }
  }

  getCoastBuildingLines() {
    const out = [];

    const lines = this.xml.findChild("CoastBuildingLines").getChildrenOfType("i");
    for (const line of lines) {
      const points = line.findChild("Points").getChildrenOfType("i");
      const directions = line.findChild("Directions").getChildrenOfType("i").map(i => +i.getInlineContent());

      const outLine = [];
      for (let i = 0; i < points.length; i++) {
        const point = points[i];
        const direction = directions[i] / ISDAsset.DIRECTION_MULTIPLIER;

        const buffer = point.getInlineContent();
        const x = buffer.readInt32LE(0) / (1 << 12);
        const z = buffer.readInt32LE(8) / (1 << 12);
        outLine.push([x, z, direction]);
      }
      out.push(outLine);
    }

    return out;
  }

  /**
   * @param {[[x, y, direction]]} points 
   */
  addCoastBuildingLine(points, directions) {
    const line = this.xml.findChild("CoastBuildingLines").createChildTag("i");
    const pointsNode = line.createChildTag("Points");
    const directionsNode = line.createChildTag("Directions");

    for (const point of points) {
      const buffer = Buffer.alloc(16);
      buffer.writeInt32LE(point[0] * (1 << 12), 0);
      buffer.writeInt32LE(point[1] * (1 << 12), 8);
      pointsNode.createChildTag("i").setInlineContent(buffer);

      directionsNode.createChildTag("i").setInlineContent(point[2] * ISDAsset.DIRECTION_MULTIPLIER);
    }

  }

  getSurfLines() {
    const out = [];

    const lines = this.xml.findChild("SurfLines").getChildrenOfType("i");
    for (const line of lines) {
      const points = line.findChild("SurfLinePoints").getChildrenOfType("i");
      const outLine = {
        setting: line.getInlineContent("SurfSetting"),
        points: []
      };
      for (const point of points) {
        const buffer = point.getInlineContent("Position");
        const x = buffer.readFloatLE(0);
        const y = buffer.readFloatLE(4);
        const z = buffer.readFloatLE(8);
        outLine.points.push({
          width: point.getInlineContent("Width"),
          position: [x, y, z]
        });
      }
      out.push(outLine);
    }

    return out;
  }

  getBuildBlockerShapes() {
    const out = [];
    const shapes = this.xml.findChild("BuildBlockerShapes").getChildrenOfType("i");
    for (const shape of shapes) {
      const shapeData = [];
      const points = shape.findChild("Polygon").getChildrenOfType("i");
      for (const point of points) {
        const buffer = point.getInlineContent();
        const x = buffer.readInt32LE(0) / (1 << 12);
        const z = buffer.readInt32LE(8) / (1 << 12);
        shapeData.push([x, z]);
      }
      out.push(shapeData);
    }

    return out;
  }

  getCamBlockerShapes() {
    const out = [];
    const shapes = this.xml.findChild("CamBlockerShapes").getChildrenOfType("i");
    for (const shape of shapes) {
      const shapeData = [];
      const points = shape.findChild("Polygon").getChildrenOfType("i");
      for (const point of points) {
        const buffer = point.getInlineContent();
        const x = buffer.readInt32LE(0) / (1 << 12);
        const z = buffer.readInt32LE(8) / (1 << 12);
        shapeData.push([x, z]);
      }
      out.push(shapeData);
    }

    return out;
  }

  /**
   * Generates an OBJ file of the island terrain
   * @returns {string} obj file content
   */
  exportAsOBJ() {
    if (!this.xml) throw new Error("No data in Island");

    // ==== Terrain ====
    const objTerrain = new OBJ("Terrain");
    const chunks = this.getAllChunks();
    for (let chunk of chunks) {
      chunk.buildToObj(objTerrain);
    }

    // ==== Coast Building Lines ====
    const objCoastBuildingLines = new OBJ("CoastBuildingLines");
    const buildingLines = this.getCoastBuildingLines();
    for (const line of buildingLines) {
      objCoastBuildingLines.addLineFromPoints(line.map((p) => [p[0], p[2], p[1]]));
    }

    // ==== Surf Lines ====
    const objSurfLines = new OBJ("SurfLines");
    const surfLines = this.getSurfLines();
    for (const line of surfLines) {
      objSurfLines.addLineFromPoints(line.points.map(p => p.position));
    }

    // ==== Build Blocker Shapes ====
    const objBuildBlockerShapes = new OBJ("BuildBlockerShapes");
    const buildBlockers = this.getBuildBlockerShapes();
    for (const blocker of buildBlockers) {
      objBuildBlockerShapes.addNGon(blocker.map((p) => [p[0], 0, p[1]]));
    }

    // ==== Camera Blocker Shapes ====
    const objCameraBlockerShapes = new OBJ("CameraBlockerShapes");
    const cameraBlockers = this.getCamBlockerShapes();
    for (const blocker of cameraBlockers) {
      objCameraBlockerShapes.addNGon(blocker.map((p) => [p[0], 0, p[1]]));
    }

    // ==== GOP HeightMap v2 ====
    const objHeightMapV2 = new OBJ("HeightMapV2");
    const heightMapV2 = this.xml.findChild("m_GOPManager").findChild("m_GRIDManager").findChild("m_HeightMap_v2").getInlineContent();

    for (let j = 0; j < this.height; j++) {
      for (let i = 0; i < this.height; i++) {
        const h0 = heightMapV2.readInt16LE((j * this.width + i) * 2) / 1024;
        objHeightMapV2.addNGon([
          [i, h0, j],
          [i + 1, h0, j],
          [i + 1, h0, j + 1],
          [i, h0, j + 1]
        ]);
      }
    }

    return OBJ.CombineToFile([objTerrain, objCoastBuildingLines, objSurfLines, objBuildBlockerShapes, objCameraBlockerShapes, objHeightMapV2]);
  }

  validate() {
    const chunks = this.getAllChunks();
    for (const chunk of chunks) {
      chunk.validate();
    }

    // Check for object id reuse
    const ids = [];
    const objects = this.getAllObjects();
    for (const object of objects) {
      if (ids.includes(object.id)) throw new Error("Object ID was already used!");
      ids.push(object.id);
    }

    // Used chunks
    const usedChunks = this.xml.findChild("UsedChunks");
    const xSize = usedChunks.getInlineContent("m_XSize");
    const ySize = usedChunks.getInlineContent("m_YSize"); // All islands in the game are square
    if (this.width / xSize != ISDAsset.CHUNK_SIZE || this.height / ySize != ISDAsset.CHUNK_SIZE) throw new Error("Chunk bitmap / Island size mismatch");

    const usedChunksBuffer = usedChunks.getInlineContent("m_BitGrid");
    if (usedChunksBuffer.length != xSize * 4) throw new Error(`Used chunks buffer size mismatch (${usedChunksBuffer.length} for ${xSize} x ${ySize})`);
    
    // for (let i = 0; i < ySize; i++) {
    //   console.log(i.toString(10).padStart(2, "0") + ": " + usedChunksBuffer.readUInt32LE(i * 4).toString(2).padStart(32, "0"));
    // }
  }

  recalculate() {
    this.recalculateHeightMaps(); 
    this.recalculateUsedChunks();
  }

  recalculateHeightMaps() {
    // This influences where the player can build.
    const heightMapV2 = this.xml.findChild("m_GOPManager").findChild("m_GRIDManager").findChild("m_HeightMap_v2");

    /**
     * @type {Buffer}
     */
    const heightBuffer = heightMapV2.getInlineContent();

    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        const bufferOffset = (y * this.width + x) * 2;
        const targetHeight = Math.max((this.getTerrainHeightAtLocation(x, y) + 0.016) * 1024, -32768);
        heightBuffer.writeInt16LE(targetHeight, bufferOffset);
      }
    }
  }

  recalculateUsedChunks() {
    const usedChunks = this.xml.findChild("UsedChunks");
    usedChunks.setInlineContent(this.width / ISDAsset.CHUNK_SIZE, "m_XSize");  // number of chunks in x-direction
    usedChunks.setInlineContent(this.height / ISDAsset.CHUNK_SIZE, "m_YSize"); // number of chunks in y-direction
    usedChunks.setInlineContent(1, "m_IntXSize"); // what does m_IntXSize do?

    const usedChunksBuffer = Buffer.alloc(this.width / ISDAsset.CHUNK_SIZE * 4);
    for (let i = 0; i < this.height / ISDAsset.CHUNK_SIZE; i++) {
      usedChunksBuffer.writeUInt32LE(0xFFFFFFFF, i * 4);  // set all chunks to used
    }
    usedChunks.setInlineContent(usedChunksBuffer, "m_BitGrid");
  }

  /**
   * Generates an empty island with the given dimensions.
   * @param {*} width 
   * @param {*} height 
   */
  async generate(width, height) {
    if (width % ISDAsset.CHUNK_SIZE !== 0) throw new Error("Width must be a multiple of " + ISDAsset.CHUNK_SIZE);
    if (height % ISDAsset.CHUNK_SIZE !== 0) throw new Error("Height must be a multiple of " + ISDAsset.CHUNK_SIZE);

    this.xml = new XMLElement("Island");
    this.xml.setInlineContent(width, "Width");
    this.xml.setInlineContent(height, "Height");
    this.clime = 0;
    this.difficulty = 0;
    this.xml.addChild(new XMLElement("UsedChunks"));
    this.xml.addChild(new XMLElement("BuildBlockerShapes"));
    this.xml.addChild(new XMLElement("CamBlockerShapes"));
    this.xml.addChild(new XMLElement("SurfLines"));
    this.xml.addChild(new XMLElement("CoastBuildingLines"));
    this.xml.addChild(new XMLElement("Lakes"));
    this.xml.addChild(new XMLElement("Rivers"));

    // RiverGrid
    const riverGrid = new XMLElement("RiverGrid");
    riverGrid.setInlineContent(width, "m_XSize");
    riverGrid.setInlineContent(height, "m_YSize");
    riverGrid.setInlineContent(6, "m_IntXSize");
    riverGrid.setInlineContent(Buffer.alloc(width * height / 8), "m_BitGrid");
    this.xml.addChild(riverGrid);

    this.seaLevel = 0;
    this.xml.addChild(new XMLElement("Sandbanks"));
    this.xml.addChild(new XMLElement("Fogbanks"));
    this.xml.addChild(new XMLElement("TerrainNormalSplines"));

    // AnimalLayer
    const animalLayer = new XMLElement("AnimalLayer");
    this.xml.addChild(animalLayer);
    for (let i = 0; i <= 8; i++) {
      const animalLayerEntry = new XMLElement("AnimalLayer" + ((i == 0) ? "" : i.toString()));
      animalLayerEntry.addChild(new XMLElement("m_AnchorPoint"));
      animalLayerEntry.addChild(new XMLElement("m_Connections"));
      animalLayer.addChild(animalLayerEntry);
    }

    this.xml.addChild(new XMLElement("AIPoints"));
    this.xml.addChild(new XMLElement("ConstructionRecords"));
    this.xml.addChild(new XMLElement("Volcanos"));
    this.sendExplorationMessage = 1;

    // m_GOPManager
    const m_GOPManager = new XMLElement("m_GOPManager");
    this.xml.addChild(m_GOPManager);

    // - m_GRIDManager
    const gridManager = new XMLElement("m_GRIDManager");
    m_GOPManager.addChild(gridManager);
    gridManager.setInlineContent(Buffer.alloc(this.width * this.height * 2), "m_HeightMap_v2");

    for (const grid of ["m_PathBlockerLayer", "m_HeightPathBlockerLayer", "m_SubmarineBlockerLayer"]) {
      const layer = new XMLElement(grid);
      const bitGrid = new XMLElement("BitGrid");
      bitGrid.setInlineContent(this.width * 2, "m_XSize");
      bitGrid.setInlineContent(this.height * 2, "m_YSize");
      bitGrid.setInlineContent(12, "m_IntXSize");
      bitGrid.setInlineContent(Buffer.alloc((this.width * 2) * (this.height * 2) / 8), "m_BitGrid");
      layer.addChild(bitGrid);
      gridManager.addChild(layer);

      if (grid == "m_SubmarineBlockerLayer") {
        layer.setInlineContent(-98304, "SubmarineLevelHeight")
        layer.setInlineContent(0, "SubmarineIslandBlockerRadius")
      }
    }

    // - m_StreetGrid
    m_GOPManager.setInlineContent(Buffer.alloc(this.width * this.height), "m_StreetGrid")

    // - Objects
    const objects = new XMLElement("Objects");
    m_GOPManager.addChild(objects);

    for (const type of ["Handle", "Feedback", "Simple", "Nature", "Grass"]) {
      const typeGroup = new XMLElement(type);
      typeGroup.addChild(new XMLElement("Objects"));
      objects.addChild(typeGroup);
    }

    // - other m_GOPManager stuff
    m_GOPManager.addChild(new XMLElement("SnapPartner"));
    m_GOPManager.addChild(new XMLElement("ObjectNames"));
    m_GOPManager.addChild(new XMLElement("ObjectGroups"));

    // Terrain
    const terrain = new XMLElement("Terrain");
    this.xml.addChild(terrain);
    terrain.setInlineContent(3, "Version");
    terrain.setInlineContent(this.width, "TileCountX");
    terrain.setInlineContent(this.height, "TileCountZ");
    terrain.setInlineContent(0, "TileCount"); // Don't ask me why this is zero

    const chunkMap = new XMLElement("ChunkMap");
    terrain.addChild(chunkMap);
    chunkMap.setInlineContent(this.width / ISDAsset.CHUNK_SIZE, "Width");
    chunkMap.setInlineContent(this.height / ISDAsset.CHUNK_SIZE, "Height");

    for (let y = 0; y < this.height / ISDAsset.CHUNK_SIZE; y++) {
      for (let x = 0; x < this.width / ISDAsset.CHUNK_SIZE; x++) {
        const chunk = new XMLElement("Element");
        chunk.setInlineContent(-1, "VertexResolution");
        chunk.setInlineContent(65536, "Flags");
        chunkMap.addChild(chunk);

        const chunkObject = new IslandChunk(x, y, chunk);
        chunkObject.generateHeightMap(4);
      }
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
    const cellWidth = ISDAsset.CHUNK_SIZE / gridSize;
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

  setHeightData(data) {
    const existingData = this.getHeightData();
    if (data.length != existingData.length) throw new Error("Wrong size of height data buffer!");
    this.xml.findChild("HeightMap").setInlineContent(data, "Data");
  }

  get heightMapWidth() {
    const heightMap = this.xml.findChild("HeightMap");
    if (!heightMap) return -1;
    return Number(heightMap.getInlineContent("Width"));
  }

  get vertexResolution() {
    return Number(this.xml.getInlineContent("VertexResolution"));
  }

  get flags() {
    return Number(this.xml.getInlineContent("Flags"));
  }

  set flags(value) {
    this.xml.setInlineContent(value, "Flags")
  }

  generateHeightMap(resolution) {
    let heightMap = this.xml.findChild("HeightMap");

    if (!heightMap) {
      heightMap = new XMLElement("HeightMap");
      this.xml.addChild(heightMap);
    }

    this.xml.setInlineContent(resolution, "VertexResolution");
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

  /**
   * Sets the texture weights for all vertices on the chunk
   * @param {TextureWeights} weights 
   */
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

    // @Todo Fix validation

    // const layers = this.xml.getChildrenOfType("TexIndexData");
    // for (const layer of layers) {
    //   const texLayer = new TextureLayer(layer);
    //   if (texLayer.width != mapWidth) throw new Error("Texture and height map are not in same scale!!!");
    // }
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
    xml.setInlineContent(index, "TextureIndex");
    const alphaMap = new XMLElement("AlphaMap");
    alphaMap.setInlineContent(size, "Width");
    alphaMap.setInlineContent(Buffer.alloc(size * size), "Data");
    xml.addChild(alphaMap);
    return new TextureLayer(xml);
  }
}

class IslandObject {

  /**
   * @param {XMLElement} xml 
   */
  constructor(xml, type = "Nature") {
    /**
     * @property {"Handle"|"Feedback"|"Simple"|"Nature"|"Grass"} Type of the object
     * @private
     */
    this._type = type;

    this.xml = xml;
  }

  get type() { return this._type; }

  get id() { return +this.xml.getInlineContent("m_ID"); }
  set id(value) { return this.xml.setInlineContent(value, "m_ID"); }

  get guid() { return +this.xml.getInlineContent("m_GUID"); }
  set guid(value) { return this.xml.setInlineContent(value, "m_GUID"); }
  
  get variation() { return +this.xml.getInlineContent("m_Variation"); }
  set variation(value) { return this.xml.setInlineContent(value, "m_Variation"); }

  get position() { return this.xml.getInlineContent("m_Position"); }
  set position(value) { return this.xml.setInlineContent(value, "m_Position"); }
  
  get playerId() { return +this.xml.getInlineContent("m_PlayerID"); }
  set playerId(value) { return this.xml.setInlineContent(value, "m_PlayerID"); }
  
  get direction() { return this.xml.getInlineContent("m_Direction"); }
  set direction(value) { return this.xml.setInlineContent(value, "m_Direction"); }

  /**
   * 
   * @param {"Handle"|"Feedback"|"Simple"|"Nature"|"Grass"} Type of the object
   * @returns {IslandObject} generated object
   */
  static Generate(type) {
    const xml = new XMLElement("Object");
    const obj = new IslandObject(xml, type);

    obj.variation = 0;
    obj.playerId = 15;
    obj.direction = 0;
    obj.guid = 337;
    obj.id = 1;

    return obj;
  }
}

/**
 * @typedef {{textureIndex: number, weight: number}} TextureWeights
 */


/**
 * SeaLevel:                Read + Write
 * Width:                   Read + Write
 * Height:                  Read + Write
 * Clime:                   Read + Write
 * Difficulty:              Read + Write
 * UsedChunks:              Write
 * BuildBlockerShapes:      Read
 * CamBlockerShapes:        Read
 * SurfLines:               Read
 * CoastBuildingLines:      Read
 * Lakes:
 * Rivers:
 * RiverGrid:
 * SeaLevel:                Read + Write
 * Sandbanks:           
 * Fogbanks: 
 * TerrainNormalSplines:
 * AIPoints:
 * ConstructionRecords:
 * Volcanos:
 * SendExplorationMessage:  Read + Write
 * m_GOPManager:
 *  - m_GRIDManager:
 *  - m_StreetGrid:
 *  - Objects:              Read + Write
 *  - SnapPartner:      
 *  - ObjectNames:
 *  - ObjectGroups:
 * Terrain:                 
 *  - Height Map:           Read + Write
 *  - TexIndexData:         Read + Write
 *  - Flags:                Read + Write  
 *  - VertexResolution:     Read + Write
 */