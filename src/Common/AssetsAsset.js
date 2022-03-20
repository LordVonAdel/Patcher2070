import XMLAsset from "../Common/XMLAsset.js";
import { XMLElement } from "./XMLParser.js";

let nextAutomatedAssetIndex = Date.now();

/**
 * Grouped Assets xml file
 */
export default class AssetsAsset extends XMLAsset {

  constructor() {
    super();

    this.groups = [];
  }

  generate() {
    this.xml = new XMLElement("Root");
    const assetList = new XMLElement("AssetList");
    this.xml.addChild(assetList);
    const rootGroup = new AssetGroup();
    rootGroup.name = "Main";
    assetList.addChild(rootGroup.xml);

    this.groups = [
      rootGroup
    ];
  }

  readData(data) {
    super.readData(data);
    const assetList = this.xml.findChild("AssetList") || this.xml.findChild("Group");
    const groups = assetList.findChild("Groups").getChildrenOfType("Group");

    this.groups.length = 0;
    for (let group of groups) {
      this.groups.push(new AssetGroup(group, null));
    }
  }

  /**
   * Gets all in this file defined assets.
   * @returns {Asset[]}
   */
  getAllAssets() {
    const assets = [];
    for (let group of this.groups) {
      assets.push(...group.getAssets());
    }
    return assets;
  }

  /**
   * @returns AssetGroup[]
   */
  getAllGroups() {
    const groups = [...this.groups];
    const out = [];

    while (groups.length > 0) {
      const group = groups.shift();
      out.push(group);
      groups.push(...group.subGroups);
    }

    return out;
  }

  /**
   * Gets a asset with a specific GUID
   * @returns {Asset}
   */
  getAssetByGUID(guid) {
    for (let group of this.groups) {
      const asset = group.find(asset => asset.Standard.GUID == guid, true);
      if (asset) return asset;
    }
    return null;
  }

  /**
   * Creates a new asset and adds it to the group tree
   * @param {AssetGroup} group group to add this to
   * @param {String} name Name of the asset. Developer only, not shown in the final game!
   * @returns 
   */
  createAsset(name = null, group = null) {
    if (this.groups.length <= 0) throw new Error("File not initialized");
    if (!name) name = "js_" + (nextAutomatedAssetIndex++);

    const asset = new Asset(group);
    asset.Standard.Name = name;
    asset.Standard.Creator = "Anno2070js";
    asset.Standard.CreationTime = (new Date()).toISOString().split('T')[0];
    asset.Standard.LastChangeUser = "Anno2070js";
    asset.Standard.LastChangeTime = asset.Standard.CreationTime;

    if (!group) group = this.groups[0];

    group.addAsset(asset);

    return asset;
  }

  getGroup(path) {
    const parts = path.split(".");
    let group = this.groups.find(group => group.name == parts[0]);
    for (let i = 1; i < parts.length; i++) {
      group = group.getSubgroup(parts[i]);
    }
    return group;
  }

  /**
   * Merges assets from another assets file into this one
   * @param {AssetsAsset} otherFile 
   */
  merge(otherFile) {
    const otherGroups = otherFile.getAllGroups();
    const thisGroups = this.getAllGroups();
    
    for (let otherGroup of otherGroups) {
      const thisGroup = thisGroups.find(group => group.path.endsWith(otherGroup.path)) ?? thisGroups[0];
      for (let asset of otherGroup.assets) {
        thisGroup.addAsset(asset);
      }
    }
  }
}

class AssetGroup {

  constructor(xml = null, parent = null) {
    if (!xml) {
      xml = new XMLElement("Group");
      xml.setInlineContent("unnamed", "Name");
      xml.addChild(new XMLElement("Assets"));
      xml.addChild(new XMLElement("Groups"));
    }

    this.xml = xml;
    this.parent = parent;
    this.subGroups = [];

    /**
     * @type {Asset[]}
     */
    this.assets = [];

    if (this.xml.findChild("Groups")) {
      const subGroupsXML = this.xml.findChild("Groups").getChildrenOfType("Group");
      for (let group of subGroupsXML) {
        this.subGroups.push(new AssetGroup(group, this)); 
      }
    }

    if (this.xml.findChild("Assets")) {
      const assets = this.xml.findChild("Assets").getChildrenOfType("Asset");
      for (let asset of assets) {
        this.assets.push(new Asset(this, asset));
      }
    }

    this.readonly = false;
  }

  getAssets(recursive = true) {
    let assets = [...this.assets];
    if (recursive) {
      for (let group of this.subGroups) {
        assets = assets.concat(group.getAssets(recursive));
      }
    }
    return assets;
  }

  getSubgroup(name) {
    return this.subGroups.find(g => g.name == name);
  }

  get path() {
    return this.parent ? this.parent.path + "." + this.name : this.name;
  }

  get name() {
    return this.xml.getInlineContent("Name");
  }

  set name(value) {
    this.xml.setInlineContent(value, "Name");
  }

  /**
   * @param {Asset} asset 
   */
  addAsset(asset) {
    this.xml.findChild("Assets", 0, true).addChild(asset.xml);
    this.assets.push(asset);
  }

  find(filter, recursive = true) {
    for (let asset of this.assets) {
      if (filter(asset)) return asset;
    }

    if (recursive) {
      for (let group of this.subGroups) {
        const result = group.find(filter, recursive);
        if (result) return result;
      }
    }

    return null;
  }
}

/**
 * Represents an ingame asset type
 */
export class Asset {

  constructor(group, xml = null) {
    this.group = group;

    if (!xml) {
      xml = new XMLElement("Asset");
    }

    this.xml = xml;

    this.values = this.xml.findChild("Values", 0, true);
  }

  /**
   * @param {string} Name of the asset
   */
  get name() {
    return this.values?.findChild("Standard")?.getInlineContent("Name");
  }

  /**
   * @param {string} template
   */
  get Template() {
    return this.xml.getInlineContent("Template");
  }

  set Template(value) {
    this.xml.setInlineContent(value, "Template");
  }

  get path() {
    return this.group.path + "." + this.name;
  }

  /**
   * @returns {Asset.Values.Standard}
   */
  get Standard() {
    return this.extractValues("Standard");
  }

  /**
   * @returns {Asset.Values.MaintenanceCost}
   */
  get MaintenanceCost() {
    return this.extractValues("MaintenanceCost");
  }

  /**
   * @returns {Asset.Values.Ship}
   */
  get Ship() {
    return this.extractValues("Ship");
  }

  /**
   * @returns {Asset.Values.Transport}
   */
  get Transport() {
    return this.extractValues("Transport");
  }

  /**
   * @returns {Asset.Values.Hitpoints}
   */
  get Hitpoints() {
    return this.extractValues("Hitpoints");
  }

  /**
   * @returns {Asset.Values.Mesh}
   */
  get Mesh() {
    return this.extractValues("Mesh");
  }

  /**
   * @returns {Asset.Values.Nameable}
   */
   get Nameable() {
    return this.extractValues("Nameable");
  } 

  /**
   * @returns {Asset.Values.TradingPrice}
   */
  get TradingPrice() {
    return this.extractValues("TradingPrice");
  }

  /**
   * @returns {Asset.Values.Building}
   */
  get Building() {
    return this.extractValues("Building");
  }

  /**
   * @returns {Asset.Values.Influence}
   */
  get Influence() {
    return this.extractValues("Influence");
  } 

  /**
   * Products usage. Also used for monuments
   * @returns {Asset.Values.Factory}
   */
  get Factory() {
    return this.extractValues("Factory");
  } 

  /**
   * @returns {Asset.Values.WareProduction}
   */
  get WareProduction() {
    return this.extractValues("WareProduction");
  } 

  /**
   * @returns {Asset.Values.Farm}
   */
  get Farm() {
    return this.extractValues("Farm");
  }

  /**
   * @returns {BuildCost}
   */
  get BuildCost() {
    return createAssetProxy(new BuildCost(this.values.findChild("BuildCost")));
  }

  /**
   * @returns {ObjectProperty}
   */
  get Object() {
    return createAssetProxy(new ObjectProperty(this.values.findChild("Object")));
  }

  /**
   * @returns {Asset.Values.RepairShips}
   */
  get RepairShips() {
    return this.extractValues("RepairShips");
  }

  /**
   * @returns {Asset.Values.Warehouse}
   */
  get Warehouse() {
    return this.extractValues("Warehouse");
  }

  /**
   * @returns {Asset.Values.Airfield}
   */
  get Airfield() {
    return this.extractValues("Airfield");
  }

  /**
   * @returns {Asset.Values.Ark}
   */
  get Ark() {
    return this.extractValues("Ark");
  }

  extractValues(category) {
    const values = this.values.findChild(category, 0, !this.readonly);
    const result = {
      xml: values
    };

    if (values) {
      for (let child of values.content) {
        result[child.name] = child.getInlineContent();
      }
    }
  
    return createAssetProxy(result);
  }
}

/**
 * @property {string} AssetCategory
 * @property {Boolean} SnapToGUID
 * @property {"None"|"Water"|"Submarine"|"TerrainOnRender"} ObjectPlacement
 * @property {string} ObjectType
 * @property {Boolean} BuildWithStoneBase
 * @property {"NoEmpTarget"|"Explorable"} ObjectFlags
 */
class ObjectProperty {
  constructor(xml) {
    /**
     * @private
     */
    this.xml = xml;
  }

  /**
   * @returns {string[]} Variations
   */
  getVariations() {
    const variations = this.xml.findChild("Variations");
    if (variations) {
      return variations.getChildrenOfType("Item").map(item => item.getInlineContent("Filename"));
    }
    return [];
  }

  /**
   * @param {string[]} items Filenames of models (.cfg)
   */
  setVariations(items) {
    const variations = this.xml.findChild("Variations", 0, true);
    variations.clear();
    for (const item of items) {
      variations.createChildTag("Item").setInlineContent(item);
    }
  }
}

/**
 * @class {BuildCost}
 * @property {IntermediateLevel} needsIntermediateLevel
 * @property {Number} ConstructionTime Construction time in milliseconds. Used for vehicles
 */
class BuildCost {

  /**
   * @param {XMLElement} xml 
   */
  constructor(xml) {
    /**
     * @private
     */
    this.xml = xml;
  }

  /**
   * @param {ResourceCost} resource Name of the resource
   * @param {Number} amount Amount needed of that resource
   */
  setResourceCost(resource, amount) {
    this.xml.findChild("ResourceCost").setInlineContent(amount, resource);
  }

  /**
   * @param {ResourceCost} resource Name of the resource
   * @returns {Number}
   */
  getResourceCost(resource) {
    return Number(this.xml.findChild("ResourceCost")?.getInlineContent(resource));
  }

  /**
   * @param {Product} Product name
   */
  setProductCosts(product, amount) {
    this.xml.findChild("ProductCost").setInlineContent(amount * 1000, product);
  }

  /**
   * Gets the product costs in units. 1 unit = 1000
   * @param {Product} Product name
   */
  getProductCosts(product) {
    const costs = this.xml.findChild("ProductCost").getInlineContent(product);
    if (!costs) return 0;
    return Number(costs) / 1000;
  }

  getFullCosts() {
    const out = {
      ProductCosts: {},
      ResourceCosts: {},
      NeedsIntermediatelevel: this.needsIntermediateLevel
    }

    const productCostsXML = this.xml.findChild("ProductCost");
    if (productCostsXML) {
      for (const item of productCostsXML.content) {
        out.ProductCosts[item.name] = Number(item.getInlineContent()) / 1000;
      }
    }

    const resourceCostsXML = this.xml.findChild("ResourceCost");
    if (resourceCostsXML) {
      for (const item of resourceCostsXML.content) {
        out.ResourceCosts[item.name] = Number(item.getInlineContent());
      }
    }

    return out;
  }
}

function createAssetProxy(object) {
  return new Proxy(object, {
    set: (obj, prop, value) => {
      if (prop in obj) {
        obj[prop] = value;
        return;
      }

      obj.xml?.setInlineContent(value, prop);
      return true;
    },
    get: (obj, prop, receiver) => {
      if (prop in obj) {
        return obj[prop];
      }
      return obj.xml?.getInlineContent(prop);
    }
  });
}

/**
 * @typedef {Object} Asset.Values.Standard
 * @property {String} [Name] Name of the asset
 * @property {String} [CreationTime] Creation time formatted in YYYY-MM-DD HH:MM
 * @property {String} [Creator] Creating user of this asset
 * @property {String} [GUID] Global unique ID
 * @property {String} [LastChangeTime] Time of the last change to this asset formatted as YYYY-MM-DD HH:MM
 * @property {String} [LastChangeUser] Last editor of this asset
 */

/**
 * @typedef {Object} Asset.Values.MaintenanceCost
 * @property {Number} [ActiveCost] Costs in Credits. Negative values clamp to 0 and display as "-" in UI
 * @property {Number} [InactiveCost] Costs in Credits when the building is paused
 * @property {Number} [ActiveEcoEffect] Eco balance times 4096
 * @property {Number} [InactiveEcoEffect] Eco balance times 4096
 * @property {Number} [ActiveEnergyCost] Energy times 4096
 * @property {Number} [InactiveEnergyCost] Energy times 4096
 * @property {"EcosEcobalanceBuilding"|"TycoonEcobalanceBuilding"} [EcoEffectType]
 * @property {"Wasteincinerator"|"EcoBalance"|"WindEnergy"|"Cogeneration"} [OverlapType]
 * @property {Boolean} [ActiveAtStart]
 * @property {Number} [EcoEffectFadingSpeed]
 * @property {"Military"|null} [MaintenanceType] 
 */

/**
 * @typedef {Object} Asset.Values.Ship    
 * @property {Number} [VisionRadius]
 * @property {Number} [DriftArea]
 * @property {Number} [ShipClaimNeeded]
 * @property {Number} [LoadFactor]
 * @property {Number} [DamageFactor]
 * @property {Number} [LoadDamageCap]
 * @property {Number} [BuildUnderwaterGUID]
 * @property {Number} [PrefersLargeDock]
 * @property {Number} [VehicleDescription] GUID to vehicle description text
 */

/**
 * @typedef {Object} Asset.Values.Transport
 * @property {Number} [SlotCount]
 * @property {Number} [SlotCapacity] 
 * @property {Boolean} [Pickup]
 */

/**
 * @typedef {Object} Asset.Values.Hitpoints
 * @property {Number} [MaxHitpoints]
 * @property {Boolean} [CallForFeedbackUnits]
 * @property {Number} [BurnThresholdPercentage]
 * @property {Number} [FireDamagePerMinute]
 * @property {Number} [BlackTideOnDestroyProbability]
 * @property {Number} [FireSoundAboveWater]
 * @property {Boolean} [Invulnerable] Used for Arks
 * @property {"MilitaryBuilding"|"Ship"|"Airship"|"Submarine"} [HitpointType]
 */

/**
 * @typedef {Object} Asset.Values.Mesh
 * @property {Boolean} [HasCollapseShader]
 * @property {Boolean} [ShowPlayerColor]
 * @property {Boolean} [ShowGlyph]
 * @property {Boolean} [EditModeOnly]
 */

/**
 * @typedef {Object} Asset.Values.TradingPrice
 * @property {Number} [BaseGoldPrice]
 */

/**
 * @typedef {Object} Asset.Values.Nameable
 * @property {"Ship"|"Submarine"|"Airship"|"AboveWater"|"UnderWater"} [NamePool]
 */

/**
 * @typedef {Object} Asset.Values.Building
 * @property {"TechsRuin"|"Techs1"|"Techs2"|"Techs3"|"EcosRuin"|"Ecos1"|"Ecos2"|"Ecos3"|"Ecos4"|"TycoonsRuin"|"Tycoons1"|"Tycoons2"|"Tycoons3"|"Tycoons4"} [BuildingLevel]
 * @property {"Markethouse"|"PublicBuilding"|"HarbourMaster"|"Pier"|"StoreHouse"|"NoBuildingType"|"Special"|"MissileLauncher"|"SimpleProduction"|"Support"|"Military"} [BuildingType]
 * @property {Number} [WorkerCount]
 * @property {Number} [BuildSound]
 * @property {Boolean} [NeedsStreetHighlights]
 * @property {Boolean} [NeedsStreetHighlights2]
 * @property {Number} [BuildDirectionFromIsland]
 * @property {StatisticsCategories} [StatisticsCategories]
 * @property {Number} [CallFirefighter]
 */

/**
 * @typedef {Object} Asset.Values.Influence
 * @property {Number} [InfluenceRadius]
 * @property {"Harbour"|"Production"|"Residence"} [InfluenceRadiusTypeNeeded] Can be multiple seperated by semicolon
 * @property {"Harbour"|"Production"|"Residence"} [InfluenceRadiusType]
 */

/**
 * @typedef {Object} Asset.Values.Factory
 * @property {Product} [RawMaterial1] Product name
 * @property {Number} [RawCapacity1]
 * @property {Number} [RawNeeded1]
 * @property {Product} [RawMaterial2] Product name
 * @property {Number} [RawCapacity2]
 * @property {Number} [RawNeeded2]
 */

/**
 * @typedef {Object} Asset.Values.WareProduction
 * @property {Number} [ProductionTime] Time in milliseconds to create a unit
 * @property {Product} [Product] Produced Product
 * @property {Number} [ProductionSound] ID of production sound
 * @property {Boolean} [NeedsStreetConnection]
 * @property {Boolean} [InterruptFeedbackOnProduction]
 */

/**
 * @typedef {Object} Asset.Values.Farm
 * @property {Number} [FarmerGUID]
 * @property {Number} [FarmFieldGUID]
 * @property {Number} [FarmfieldCount]
 * @property {Fertility} [Fertility]
 * @property {Number} [ChangeResourceObjectGroup]
 */

/**
 * @typedef {Object} Asset.Values.RepairShips
 * @property {Number} [RepairRadius]
 * @property {Number} [HealingPointsPerMinute]
 * @property {Number} [RepairBuildingsPointsPerMinute]
 */

/**
 * @typedef {Object} Asset.Values.Warehouses
 * @property {Number} [Capacity]
 * @property {Boolean} [CanTradeWithShip]
 * @property {Number} [PassiveTradeSlots]
 */

/**
 * @typedef {Object} Asset.Values.Airfield
 * @property {Number} [MaximumFuelStorage]
 * @property {Number} [NoFuelDowngrade]
 */

/**
 * @typedef {Object} Asset.Values.Ark
 * @property {String} [Picture]
 * @property {String} [Thumbnail]
 * @property {Number} [RelocationGhost]
 * @property {Number} [LeavingArk]
 */

/**
 * @typedef {"NoFertility"|"Wood"|"SugarBeet"|"Rice"|"Tea"|"Vegetables"|"Truffles"|"Fruits"|"Grain"|"Corn"|"Coffee"|"Grapes"|"Algae"|"Diamonds"|"ManganeseNodules"|"Wildcard"|"BlackSmoker"|"BlackSmokerGold"|"BlackSmokerCopper"|"BlackSmokerUranium"|"BlackSmokerIron"|"Sponges"} Fertility
 * @typedef {"NoProduct"|"BuildingModules"|"Tools"|"Wood"|"Glass"|"Concrete"|"Steel"|"Carbon"|"Fish"|"ComfortFood"|"HealthFood"|"TVDinner"|"LuxuryMeal"|"FunctionalFood"|"Tea"|"HealthDrink"|"Liquor"|"Champagne"|"EnergyDrink"|"Toys"|"Jewelry"|"Pharmaceuticals"|"Communicator"|"Holographer"|"HomeRobot"|"Coal"|"Granulate"|"IronOre"|"Iron"|"Copper"|"Limestone"|"Sand"|"RawOil"|"Oil"|"Microchips"|"Sugar"|"ManganeseNodules"|"RareEarths"|"Diamonds"|"Uranium"|"Meat"|"SuperFlavor"|"Explosives"|"Lobster"|"Truffles"|"Grapes"|"GoldNuggets"|"Gold"|"OmegaAcids"|"SecretIngredient"|"Soy"|"Vegetables"|"Fruits"|"Milk"|"Grain"|"Flour"|"Corn"|"Biopolymer"|"Caffeine"|"Algae"|"FuleRod"|"Kerosene"|"Weapons"|"HeavyWeapons"|"AdvancedWeapons"|"CoralExtract"|"LaboratoryInstruments"|"NeuroImplants"|"BioSuites"|"Enzymes"|"Platinum"|"Sponges"|"Lithium"|"EnergyCells"|"Exoskeleton"|"Coral"} Product
 * @typedef {"NoIntermediate"|"IntermediateEcos"|"IntermediateEcos1"|"IntermediateEcos2"|"IntermediateEcos3"|"IntermediateEcos4"|"IntermediateTycoons"|"IntermediateTycoons1"|"IntermediateTycoons2"|"IntermediateTycoons3"|"IntermediateTycoons4"|"IntermediateTechs"|"IntermediateTechs1"|"IntermediateTechs2"|"Intermediate1"|"Intermediate2"|"Intermediate3"|"Intermediate4"|"IntermediateTools"|"IntermediateTVDinner"|"IntermediateHealthFood"|"IntermediateLuxuryMeal"|"IntermediateComfortFood"|"IntermediateFunctionalFood"|"IntermediateTea"|"IntermediateLiquor"|"IntermediateHealthDrink"|"IntermediateChampagne"|"IntermediateEnergyDrink"|"IntermediateCommunicator"|"IntermediateHolographer"|"IntermediateHomeRobot"|"IntermediateToys"|"IntermediateJewelry"|"IntermediatePharmaceuticals"|"IntermediateSand"|"IntermediateOil"|"IntermediateUranium"|"IntermediateDiamond"|"IntermediateMangan"|"IntermediateSugar"|"IntermediateLimestone"|"IntermediateChips"|"IntermediateWeapons"|"IntermediateHeavyWeapons"|"IntermediateAdvancedWeapons"|"IntermediateMissileLaunching"|"IntermediateCogeneration"|"IntermediateSolarTower"|"IntermediateNuclearPower"|"IntermediateAirport"|"IntermediateContainerHarbour"|"IntermediateCasino"|"IntermediateConcertHall"|"IntermediateAcademy"|"IntermediateMinistryOfTruth"|"IntermediateEducationNetwork"|"IntermediateBroadcastingStation"|"IntermediateCorporateHeadquarter"|"IntermediateCongressCenter"|"IntermediateRubbleMine"|"IntermediateWasteIncinerator"|"IntermediateRiverfilterplant"|"IntermediateOzonemaker"|"IntermediateFinalStorage"|"IntermediateBlackSmoker"|"IntermediateLaboratory"|"IntermediateScience1"|"IntermediateScience2"|"IntermediateScience3"|"IntermediateScience4"|"IntermediateFire"|"IntermediateDisease"|"IntermediateCrime"|"IntermediateNever"|"IntermediateTechs3"|"IntermediateTransmission"|"IntermediateGeothermical"|"IntermediateDefencePlatform"|"IntermediateCoralExtract"|"IntermediateLaboratoryInstruments"|"IntermediateNeuroImplants"|"IntermediateBioSuites"|"IntermediateTechsMonument1"|"IntermediateTechsMonument2"|"IntermediateTechsMonument3"|"IntermediateTechsMonument4"|"IntermediateTownAcquisition"} IntermediateLevel
 * @typedef {"Credits"} ResourceCost
 * @typedef {"Public"|"Residents"|"Food;Drink"|"Military"|"Warehouses"|"Clothes;Property;Building materials"} StatisticsCategories
 **/