import XMLAsset from "../Common/XMLAsset.js";
import ISDAsset from "../XML/ISDAsset.js";
import { XMLElement } from "../Common/XMLParser.js";

/**
 * WWWAssets store the game world
 */
export default class WWWAsset extends XMLAsset {
  readData(data) {
    super.readData(data);
    this.xml = this.xml.findChild("WorldConfig");
  }

  get height() {
    return Number(this.xml.getInlineContent("Height"));
  }
  set height(value) {
    return Number(this.xml.setInlineContent(value, "Height"));
  }

  get width() {
    return this.xml.getInlineContent("Width");
  }
  set width(value) {
    return this.xml.setInlineContent(value, "Width");
  }

  generate() {
    this.xml = new XMLElement("WorldConfig");
    this.height = 100;
    this.width = 100;
    this.xml.addChild(new XMLElement("Areas"));
    this.xml.addChild(new XMLElement("ArkSlots"));

    const lightProfiles = new XMLElement("WorldLightProfiles")
    lightProfiles.addChild(new XMLElement("North"));
    lightProfiles.addChild(new XMLElement("South"));
    lightProfiles.addChild(new XMLElement("UnderwaterNorth"));
    lightProfiles.addChild(new XMLElement("UnderwaterSouth"));
    this.xml.addChild(lightProfiles);
    
    this.xml.addChild(new XMLElement("Islands"));
  }

  /**
   * @returns {WorldConfigIsland[]} islands
   */
  getIslands() {
    const islandsData = this.xml.findChild("Islands").getChildrenOfType("v");
    return islandsData.map(xml => new WorldConfigIsland(xml));
  }

  addIsland(isdFilename, x, y, direction = 0) {
    
  }

  /**
   * @returns {WorldConfigArea[]} areas
   */
  getAreas() {
    const areaData = this.xml.findChild("Areas").getChildrenOfType("i");
    return areaData.map(xml => new WorldConfigArea(xml));
  }

  /**
   * @param {WorldConfigArea} area 
   */
  addArea(name, polygon) {
    const area = new WorldConfigArea(new XMLElement("i"));
    area.generate();
    area.name = name;
    this.xml.findChild("Areas").addChild(area.xml);
  }

}

export class WorldConfigIsland {

  /**
   * 
   * @param {XMLElement} xml 
   */
  constructor(xml) {
    this.xml = xml;
    if (!xml.hasContent) {
      this.generate();
    }
  }

  generate() {  
    this.xml.setInlineContent("hasValue", 1);
    const islandConfig = new XMLElement("IslandConfig");
    islandConfig.setInlineContent("UnnamedIsland", "Name");
    islandConfig.setInlineContent("", "Filename");
    islandConfig.setInlineContent(0, "Direction");
    islandConfig.setInlineContent(100, "PositionX");
    islandConfig.setInlineContent(100, "PositionY");
    islandConfig.setInlineContent(100, "Width");
    islandConfig.setInlineContent(100, "Height");
    islandConfig.setInlineContent(0, "Type");
    islandConfig.setInlineContent(0, "MissionID");
    islandConfig.setInlineContent("", "m_Resources");
    islandConfig.setInlineContent("", "m_Fertility");
    islandConfig.setInlineContent("North", "LightProfile");
    islandConfig.setInlineContent("", "AutoBuildConfig");
    this.xml.addChild(islandConfig);
  }

  set name(value) { this.xml.findChild("IslandConfig").setInlineContent(value, "Name"); }
  get name() { return this.xml.findChild("IslandConfig").getInlineContent("Name"); }

  set direction(value) { this.xml.findChild("IslandConfig").setInlineContent(value, "Direction"); }
  get direction() { return this.xml.findChild("IslandConfig").getInlineContent("Direction"); }

  set positionX(value) { this.xml.findChild("IslandConfig").setInlineContent(value, "PositionX"); }
  get positionX() { return this.xml.findChild("IslandConfig").getInlineContent("PositionX"); }

  set positionZ(value) { this.xml.findChild("IslandConfig").setInlineContent(value, "PositionZ"); }
  get positionZ() { return this.xml.findChild("IslandConfig").getInlineContent("PositionZ"); }

  /**
   * @type {Anno2070.LightProfile} Light profile
   */
  set lightProfile(value) { this.xml.findChild("IslandConfig").setInlineContent(value, "LightProfile"); }
  get lightProfile() { return this.xml.findChild("IslandConfig").getInlineContent("LightProfile"); }

  /**
   * @param {string} filename
   * @param {ISDAsset} isd 
   */
  assignISDAsset(filename) {
    this.xml.findChild("IslandConfig").setInlineContent(isd.width ,"Width");
    this.xml.findChild("IslandConfig").setInlineContent(isd.height ,"Height");
    this.xml.findChild("IslandConfig").setInlineContent(filename ,"Filename");
  }

  /**
   * @param {Anno2070.Fertility[]} value 
   */
  set fertilities(values) {
    const fertilityNode = this.xml.findChild("IslandConfig").findChild("m_Fertility");
    fertilityNode.clear();
    for(const value of values) {
      const index = new XMLElement("i");
      index.setInlineContent(value, "Fertility");
      fertilityNode.addChild(index);
    }
  }

  /**
   * @returns {Anno2070.Fertility[]} value
   */
  get fertilities() {
    const out = [];
    const fertilityNode = this.xml.findChild("IslandConfig").findChild("m_Fertility");
    for (const child of fertilityNode.getChildrenOfType("i")) {
      out.push(child.getInlineContent("Fertility"));
    }
    return out;
  }

  set resources(values) {
    const resourcesNode = this.xml.findChild("IslandConfig").findChild("m_Resources");
    resourcesNode.clear();
    for(const value of values) {
      const index = new XMLElement("i");
      const resourceType = new XMLElement("ResourceType");
      resourceType.setInlineContent(value.type, "ResourceType");
      index.setInlineContent(value.amount, "Amount");
      resourcesNode.addChild(index);
    }
  }

  get resources() {
    const out = [];
    const fertilityNode = this.xml.findChild("IslandConfig").findChild("m_Resources");
    for (const child of fertilityNode.getChildrenOfType("i")) {
      out.push({ 
        // yep this is really doubled
        type: child.findChild("ResourceType").getInlineContent("ResourceType"),
        amount: child.getInlineContent("Amount")
      });
    }
    return out;
  }

}

export class WorldConfigArea {
  constructor(xml) {
    this.xml = xml;
    if (!xml.hasContent()) {
      this.generate();
    }
  }

  generate() {
    this.xml.setInlineContent(1, "hasValue");
    this.xml.setInlineContent("1", "m_Name");
    const shape = new XMLElement("m_Shape");
    this.xml.addChild(shape);

    const polygon = new XMLElement("Polygon");
    shape.addChild(polygon);
  }

  get name() { return this.xml.getInlineContent("m_Name"); }
  set name(value) { this.xml.setInlineContent(value, "m_Name"); }

  getPolygon() {
    const polygon = this.xml.findChild("m_Shape").findChild("Polygon");
    const out = [];

    const points = polygon.getChildrenOfType("i");
    for (const point of points) {
      /**
       * @type {Buffer}
       */
      const buffer = point.getInlineContent();
      let x = buffer.readInt32LE(0);
      let z = buffer.readInt32LE(0);
      out.push({ // @ToDo: Find out what format these numbers are using
        x, z
      });
    }

    return out;
  }

  setPolygon(points) {
    const polygon = this.xml.findChild("m_Shape").findChild("Polygon");
    polygon.clear();


  }
}