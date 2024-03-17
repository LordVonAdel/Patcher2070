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
    const assetList = this.xml.findChild("AssetList");

    if (assetList) {
      const groups = assetList.findChild("Groups").getChildrenOfType("Group");
      this.groups.length = 0;
      for (let group of groups) {
        this.groups.push(new AssetGroup(group, null));
      }
      return;
    }

    this.groups = [
      new AssetGroup(this.xml.findChild("Group"), null)
    ]
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

  removeAssetByGUID(guid) {
    for (let group of this.groups) {
      /**
       * @type {Asset}
       */
      const asset = group.find(asset => asset.Standard.GUID == guid, true);
      if (asset) {
        asset.group.removeAsset(asset);
        return true;
      }
    }
    return false;
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

    const asset = new Asset();
    asset.Standard.Name = name;
    asset.Standard.Creator = "Anno2070js";
    asset.Standard.CreationTime = (new Date()).toISOString().split('T')[0];
    asset.Standard.LastChangeUser = "Anno2070js";
    asset.Standard.LastChangeTime = asset.Standard.CreationTime;

    // Add to group
    if (!group) group = this.groups[0];
    group.addAsset(asset);

    asset.readonly = false;
    return asset;
  }

  /**
   * @param {Asset} asset
   */
  cloneAsset(source) {
    const target = this.createAsset(null, source.group);
    target.readonly = false;
    source.xml.cloneTo(target.xml);
    target.Standard.Name = source.Standard.Name + " (cloned)";
    return target;
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

    /**
     * @type {XMLElement}
     */
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
        this.addAsset(new Asset(asset))
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
    asset.group = this;
  }

  /**
   * @param {Asset} asset
   */
  removeAsset(asset) {
    this.xml.findChild("Assets").removeChild(asset.xml);
    this.assets.splice(this.assets.indexOf(asset), 1);
    asset.group = null;
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

  readonly = false;

  /**
   * @type {AssetGroup}
   */
  group = null;

  constructor(xml = null) {
    if (!xml) {
      xml = new XMLElement("Asset");
    }

    /**
     * @type {XMLElement}
     */
    this.xml = xml;
  }

  get values() {
    return this.xml.findChild("Values", 0, true);
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
   * @returns {Asset.Values.MobileBuilding}
   */
  get MobileBuilding() {
    return this.extractValues("MobileBuilding");
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
    return createAssetProxy(new BuildCost(this.values.findChild("BuildCost", 0, true)));
  }

  /**
   * @returns {ObjectProperty}
   */
  get Object() {
    return createAssetProxy(new ObjectProperty(this.values.findChild("Object", 0, true)));
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

  /**
   * @returns {Asset.Values.Reward}
   */
  get Reward() {
    return this.extractValues("Reward");
  }

  /**
   * @returns {Asset.Values.Selection}
   */
  get Selection() {
    return this.extractValues("Selection");
  }

  extractValues(category) {
    const values = this.values.findChild(category, 0, !this.readonly);
    const result = {
      xml: values
    };

    // if (values) {
    //   for (let child of values.content) {
    //     result[child.name] = child.getInlineContent();
    //   }
    // }

    return createAssetProxy(result);
  }
}

/**
 * @property {string} AssetCategory
 * @property {0|1} SnapToGUID
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
      return variations.getChildrenOfType("Item").map(item => item.getInlineContent("Filename").replaceAll("\\", "/"));
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
      variations.createChildTag("Item").setInlineContent(item.replaceAll("/", "\\"), "Filename");
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
   * @param {PlayerResource} resource Name of the resource
   * @param {Number} amount Amount needed of that resource
   */
  setResourceCost(resource, amount) {
    this.xml.findChild("ResourceCost", 0, true).setInlineContent(amount, resource);
  }

  /**
   * @param {ResourceCost} resource Name of the resource
   * @returns {Number}
   */
  getResourceCost(resource) {
    return Number(this.xml.findChild("ResourceCost", 0, true)?.getInlineContent(resource));
  }

  /**
   * @param {Product} Product name
   */
  setProductCosts(product, amount) {
    this.xml.findChild("ProductCost", 0, true).setInlineContent(amount * 1000, product);
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
        return true;
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
 * @property {EcoEffectType} [EcoEffectType]
 * @property {OverlapType} [OverlapType]
 * @property {Boolean} [ActiveAtStart]
 * @property {Number} [EcoEffectFadingSpeed]
 * @property {MaintenanceType} [MaintenanceType]
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
 * @property {NamePools} [NamePool]
 */

/**
 * @typedef {Object} Asset.Values.Building
 * @property {"TechsRuin"|"Techs1"|"Techs2"|"Techs3"|"EcosRuin"|"Ecos1"|"Ecos2"|"Ecos3"|"Ecos4"|"TycoonsRuin"|"Tycoons1"|"Tycoons2"|"Tycoons3"|"Tycoons4"} [BuildingLevel]
 * @property {BuildingType} [BuildingType]
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
 * @property {InfluenceType} [InfluenceRadiusTypeNeeded] Can be multiple seperated by semicolon
 * @property {InfluenceType} [InfluenceRadiusType]
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
 * @typedef {Object} Asset.Values.Reward
 * @property {0|1} [RequiresActivation]
 * @property {Number} [Description] GUID
 * @property {string} [PreviewPicture]
 * @property {RewardCategory} [Category]
 * @property {Number} [TypeName]
 * @property {string} [PreviewPictureThumb]
 */

/**
 * @typedef {Object} Asset.Values.MobileBuilding
 * @property {Number} [RelocationGUID] GUID of the thing placed by the player after initaiting relocation
 * @property {Number} [TransportGUID] GUID
 */

/**
 * @typedef {Object} Asset.Values.Selection
 * @property {GUIType} [GUIType]
 */

/**
 * @typedef {"Goto"|"ShipAttack"|"Pickup"|"ItemBoardShip"|"MilitaryRelocate"|"MilitaryStop"|"MilitaryAttack"|"MilitarySupport"|"ItemExpedition"|"ShipEscort"|"ShipPatrol"|"EMP"|"ItemRepairBuilding"} AbortReason
 * @typedef {"Global"|"Island"|"Utopia"|"Dystopia"|"Water"|"Coast"|"Objects"|"Tsunami"|"TsunamiOpenWater"} AmbientType
 * @typedef {"TYPE_FISH"|"TYPE_BIRD"|"TYPE_DOLPHIN"|"TYPE_JELLYFISH"} AnimalBoidType
 * @typedef {"Fischlayer_small"|"Fischlayer_medium"|"Fischlayer_high"|"Birdlayer1"|"BirdLayer_OverWater"|"DeepSeaLayer"|"SharkLayer_Campaign"|"MantaLayer_Campaign"|"JellyFishLayer_Campaign"|"JellyFishGreenLayer_Campaign"} AnimalLayer
 * @typedef {"Wildanimal"|"Predator"|"Minianimal"} AnimalType
 * @typedef {"Root"|"Building"|"Residence"|"Production"|"WareProduction"|"EnergyProduction"|"Special"|"Ark"|"Military"|"Trade"|"Science"|"Laboratory"|"Academy"|"Vehicle"|"Ship"|"Airship"|"Submarine"|"OzoneMaker"|"PoliceStation"|"Hospital"|"Planter"|"FireStation"|"PublicBuilding"|"ActivityBuilding"|"InformationBuilding"|"ParticipationBuilding"|"CommunityBuilding"|"MobileWareProduction"|"MobileMilitaryBuilding"|"MonitoringStation"|"WareProductionFarmfield"|"Windpark"|"EcoResidence"|"TycoonResidence"|"TechResidence"|"EcoWareProduction"|"TycoonWareProduction"|"TechWareProduction"|"OtherWareProduction"|"EcoEnergyProduction"|"TycoonEnergyProduction"|"TechEnergyProduction"|"EcoShip"|"TycoonShip"|"HydroelectricPowerPlant"|"CogenerationPowerPlant"|"SolarTower"|"SeaCurrentTurbine"|"FinalStorage"|"WasteIncinerator"|"RiverFilterPlant"|"WeatherControlBase"|"Harbour"|"RepairDock"|"ShieldGenerator"|"EcologicProduction"|"EcoEcologicProduction"|"TycoonEcologicProduction"|"TechEcologicProduction"|"Resource"|"Props"|"Flotsam"|"Shipyard"|"ThirdPartyProp"|"DeacidificationStation"|"TechShip"|"EcoTradingShip"|"EcoWarShip"|"TycoonTradingShip"|"TycoonWarShip"|"TechTradingShip"|"TechWarShip"|"ThirdPartyHQ"|"MissileLaunching"|"OffshoreWindpark"|"Infrastructure"|"Ornamental"|"FormerBalanceEco"|"FormerBalanceTech"|"GeothermicalPowerPlant"} AssetCategory
 * @typedef {"WallBuilding"|"OverWallBuilding"|"HabourBuilding"|"OverHabourBuilding"|"OverRiver"|"CoastBuilding"|"OverCoastBuilding"|"CivilBuilding"|"OverCivilBuilding"|"OverStreetAndOrnament"|"RiverBuilding"|"OverRiverBuilding"|"NoRiverBlocking"|"Ornament"|"UnderwaterBuilding"} BlockingType
 * @typedef {"False"|"True"} Boolean
 * @typedef {"OK"|"AreaBlocked"|"NeedProductionInfluence"|"NeedResidenceInfluence"|"NeedProductionInfluenceIntersection"|"NeedMineSlot"|"NeedRiverSlot"|"NeedCoast"|"NeedHarbor"|"NeedWaterAccess"|"NeedHarborInfluence"|"NeedCoastOrWater"|"SandStorm"|"NeedsUnderwater"|"NotUnderwater"|"NeedDamSlot"|"NeedArkSlot"|"NeedGeothermicalSlot"} BuildableType
 * @typedef {"NoBuildingType"|"Kontor"|"Markethouse"|"Residence"|"Farm"|"Factory"|"Farmfield"|"PublicBuilding"|"Ornament"|"Military"|"MarketPlace"|"Support"|"Monument"|"StoreHouse"|"HarbourMaster"|"Pier"|"ShipRepair"|"Shipyard"|"Bridge"|"Ark"|"MissileLauncher"|"Airport"|"Special"|"SimpleProduction"|"Transmitter"} BuildingType
 * @typedef {"UnderWater"|"Normal"|"Far"} CameraLayer
 * @typedef {"Kontor"|"Arc"|"Ship"|"PlayerKontor"|"PlayerArc"|"PlayerShip"} CameraTarget
 * @typedef {"NoCategory"|"Food"|"Drink"|"Lifestyle"|"Company"|"Activity"|"Information"|"Participation"} Category
 * @typedef {"Small"|"ExtraLarge"} CitySize
 * @typedef {"Normal"|"Underwater"} Clime
 * @typedef {"HomeMission"|"Normal"|"Important"} ConquestMissionType
 * @typedef {"Ship"|"Submarine"|"Plane"} DestructionType
 * @typedef {"Scheich"|"Buildmaterial"|"FillHouse"|"VitaminB"|"AddGoods"|"StartDisaster"|"StartInfection"|"AddHitpoints"|"ToggleBuildingRules"|"DiscoverAll"|"StartQuest"|"IncreasePlayerReputation"|"IAmTheKing"|"JumpGameTime"|"AddItem"|"SetGUID"|"UpgradeBuilding"|"SetEcoBalance"|"StartStandardQuest"|"AddSpawnGUID"} DevCheat
 * @typedef {"Fire"|"Disease"|"Explosion"|"Crime"|"CrimeSource"|"CrimeVisited"|"BlackTide"|"NuclearExplosion"|"NuclearFallout"|"Storm"|"Tsunami"} DisasterType
 * @typedef {"Base"|"ProductionBuilding"|"EcosEcobalanceBuilding"|"TycoonEcobalanceBuilding"|"BlackTide"|"Tree"|"NuclearFallout"|"Item"} EcoEffectType
 * @typedef {"Explosion"|"Watersplash"|"AnimalWaterSplash"|"NuclearExplosion"|"SmallExplosion"|"LargeExplosion"|"WaterExplosion"|"Shield"|"Crater"|"Takeover"} Effect
 * @typedef {"Critical"|"Shortage"|"Normal"|"OverProduction"} EnergyState
 * @typedef {"Perfect"|"Outstanding"|"Promising"|"Neutral"|"Critical"|"Alarming"|"Disastrous"} EnvironmentalState
 * @typedef {"NoFertility"|"Wood"|"SugarBeet"|"Rice"|"Tea"|"Vegetables"|"Truffles"|"Fruits"|"Grain"|"Corn"|"Coffee"|"Grapes"|"Algae"|"Diamonds"|"ManganeseNodules"|"Wildcard"|"BlackSmoker"|"BlackSmokerGold"|"BlackSmokerCopper"|"BlackSmokerUranium"|"BlackSmokerIron"|"Sponges"} Fertility
 * @typedef {"EcoFertility"|"TycoonFertility"} FertilityCorruption
 * @typedef {"AIR"|"LAND"|"WATER"|"UNDERWATER"|"SUBMARINE"} ForceBlockingUpdateType
 * @typedef {"None"|"Ingratiate"|"ForeignFlag"|"ShipExplosion"|"Intimidate"|"Denigrate"|"Eloquence"|"RequestPeace"|"WhiteFlag"|"LetterOfMarque"|"Fertility"|"ForceTreaty"|"Pet"|"ConstructionPlan"|"SeaChart"|"Hijacker"|"DemandQuest"|"DemandTribute"|"DeclareWar"|"SupportFleet"|"StartJob"|"Upgrade"|"Expedition"|"SetPlayerFlag"|"ForceStay"|"ToggleFlyHeight"|"ShuffleItems"|"Renegade"|"GiveUpBuilding"|"IslandUpgrade"|"IncreaseTradeRate"|"Stealth"|"MoneyLender"|"SpecialSupply"|"CleanupService"|"DemandRelicHunterQuest"|"Investment"|"TakeOver"|"LongDistanceRockets"|"UnderwaterBombs"|"CreateSeaMine"|"SeaMine"|"SpawnDrone"|"Shipment"|"EmploymentContract"|"LightTracking"|"WaitOnPosition"|"EMP"|"IncreaseDiplomacyPoints"|"StartQuest"|"ResourceFill"|"MarketPower"|"BlackTideCleanUp"|"RepairBuilding"|"CreateLicense"|"ArkEffects"|"DeactivateBlackSmoker"|"BlockPlayerFunction"|"StealthDetection"|"GhostStealth"|"GhostDetection"|"StopProtest"|"CleanNeutralEcoBuilding"} GameAction
 * @typedef {"Anno5"|"Addon01"} GameVersion
 * @typedef {"None"|"ShipArrived"|"ShipLeft"|"FreeDummy"|"CleanUp"|"QuestComplete"|"FireStarted"|"SearchDisease"|"SearchCrime"|"FeedbackUnitArrived"|"QuestRewardChosen"|"ShipTradeFeedback"|"CleanUpTakeOverFeedback"|"Orbit"} GenericEventType
 * @typedef {"GrowByScale"|"GrowByHeight"|"ShrinkByScaleAndDie"} GrowType
 * @typedef {"Undefined"|"Factory"|"Farm"|"House"|"MilitaryTower"|"Marine"|"MarketPlace"|"NeutralBase"|"Pier"|"Resource"|"Ruin"|"Ship"|"Storehouse"|"Warehouse"|"WarehouseLand"|"Bailiwick"|"Media"|"Laboratory"|"Academy"|"SpecialBuilding_PowerPlant"|"Airship"|"Airport"|"Ozonemaker"|"MonitoringStation"|"Ark"|"SpecialBuilding_Eco"|"SpecialBuilding_Misc"|"MissileLauncher"|"ShieldGenerator"|"Monument"|"Flotsam"|"EnergyTransmitter"|"Lighthouse"} GUIType
 * @typedef {"BlockActions"|"BlockDemolitions"|"Invisible"|"IsDead"|"CreatedByItem"|"DestroyHandleBelowWater"|"HasBeenOnFreePath"|"AttackableByHumansOnly"|"DisableAudioFeedback"|"DestroyOnSelection"|"IsRelocating"|"IsControlledByFeedbackSystem"|"InvisibleToOtherPlayers"|"AffectedByStealthDetection"|"Protesting"|"Recolor"|"AffectedByTsunami"|"DestroyBeforeTsunami"} HandleFlag
 * @typedef {"Production"|"Residence"|"Harbour"|"Island"} InfluenceType
 * @typedef {"ABLQuest"|"Quest"|"Ecobalance_positive"|"Ecobalance_negative"|"Ecobalance_nuclear"|"Fire"|"UnderwaterFire"|"CargolifterRelocationTarget"|"CargolifterRelocationPickup"|"Protest"|"NoStreetConnectionToMarketplace"|"Fallout"|"Disease"|"Crime"|"CrimeVisited"|"ResidentsLeaving"|"UpgradeReady"|"InitTime"|"ProductionStopped"|"ProductionStopped2"|"BelowMinimumEnergy"|"IslandStorageFull"|"PickupMissing"|"InternalStorageFull"|"FertilityMissing"|"FarmfieldsMissing"|"BlackSmokerActive"|"WrongResource"|"ResourceEmpty"|"WoodResourceEmpty"|"ProductivityBlackTide"|"NoRawPickup"|"ProductivityNull"|"BuildmaterialBlocked"|"TakeOverAttacker"|"TakeOverTarget"|"Research"|"MapIsland"|"GoodsTraded"|"WaitForDocking"|"Repairing"|"ShipToCatch"|"BoardEnemyShipAttacker"|"BoardEnemyShipTarget"|"EMP"|"AirshipLanding"|"ShipOnExpedition"|"ShipReturnedFromExpedition"|"ShipIsExploding"|"ShipWhiteFlag"|"ShipLetterOfMarque"|"StealthRadius"|"Stealth"|"TreasureHunt"|"BlacktideCleanup"|"Neutral"|"UnderwaterOil"|"UnderwaterRubble"|"Lobster"|"MineSnap"|"RiverSnap"|"DamSnap"|"ArkSnap"|"GeothermicalSnap"|"BlackSmoker"|"BlackSmoker2"|"ShipHasBeenBoarded"|"ShipToSell"|"QuestItem"|"StartShip"|"QuestFlotsam"|"QuestCastaway"|"QuestFleetMainShip"|"QuestFleetItem"|"QuestEscortItem"|"QuestShipAccident"|"QuestMapIslandItem"|"QuestShipHuntItem"|"QuestgiverKontor"|"QuestgiverArk"|"QuestgiverWarehouse"|"QuesttakerObject"|"QuestCatchShipItem"|"QuestShipBlockadeShip"|"QuestShipBlockadeItem"|"QuestTreasureItem"|"QuestPuzzlePictureItem"|"QuestShipHuntShip"|"QuestMappingSuccessfull"|"QuestTreasureHuntSuccessfull"|"QuestRobinsonCrusoeExplore"|"QuestRobinsonCrusoeItem"|"None"|"QuestTradingRaceStation"|"RepairObject"|"ScannerRadius"|"CustomInfolayerAsset"|"SupportFleet"|"Hitpointsbar"|"Shieldbar"|"StealthDetectionRadius"|"HijackStealAttacker"|"HijackStealTarget"|"QuestRelict"|"MonitoringStation"|"Ozonemaker"|"QuestSunkenShip"|"GhostStealthRadius"|"GhostDetectionRadius"|"ShipToEscort"|"GuidingEscortTask"|"GuidingEscort"|"GuidingEscortStation"|"Nuclear_Submarine"|"ShipPausedOnTraderoute"} InfoLayerType
 * @typedef {"GoodNews"|"Info"|"Warning"|"System"} IngameMsgType
 * @typedef {"NoIntermediate"|"IntermediateEcos"|"IntermediateEcos1"|"IntermediateEcos2"|"IntermediateEcos3"|"IntermediateEcos4"|"IntermediateTycoons"|"IntermediateTycoons1"|"IntermediateTycoons2"|"IntermediateTycoons3"|"IntermediateTycoons4"|"IntermediateTechs"|"IntermediateTechs1"|"IntermediateTechs2"|"Intermediate1"|"Intermediate2"|"Intermediate3"|"Intermediate4"|"IntermediateTools"|"IntermediateTVDinner"|"IntermediateHealthFood"|"IntermediateLuxuryMeal"|"IntermediateComfortFood"|"IntermediateFunctionalFood"|"IntermediateTea"|"IntermediateLiquor"|"IntermediateHealthDrink"|"IntermediateChampagne"|"IntermediateEnergyDrink"|"IntermediateCommunicator"|"IntermediateHolographer"|"IntermediateHomeRobot"|"IntermediateToys"|"IntermediateJewelry"|"IntermediatePharmaceuticals"|"IntermediateSand"|"IntermediateOil"|"IntermediateUranium"|"IntermediateDiamond"|"IntermediateMangan"|"IntermediateSugar"|"IntermediateLimestone"|"IntermediateChips"|"IntermediateWeapons"|"IntermediateHeavyWeapons"|"IntermediateAdvancedWeapons"|"IntermediateMissileLaunching"|"IntermediateCogeneration"|"IntermediateSolarTower"|"IntermediateNuclearPower"|"IntermediateAirport"|"IntermediateContainerHarbour"|"IntermediateCasino"|"IntermediateConcertHall"|"IntermediateAcademy"|"IntermediateMinistryOfTruth"|"IntermediateEducationNetwork"|"IntermediateBroadcastingStation"|"IntermediateCorporateHeadquarter"|"IntermediateCongressCenter"|"IntermediateRubbleMine"|"IntermediateWasteIncinerator"|"IntermediateRiverfilterplant"|"IntermediateOzonemaker"|"IntermediateFinalStorage"|"IntermediateBlackSmoker"|"IntermediateLaboratory"|"IntermediateScience1"|"IntermediateScience2"|"IntermediateScience3"|"IntermediateScience4"|"IntermediateFire"|"IntermediateDisease"|"IntermediateCrime"|"IntermediateNever"|"IntermediateTechs3"|"IntermediateTransmission"|"IntermediateGeothermical"|"IntermediateDefencePlatform"|"IntermediateCoralExtract"|"IntermediateLaboratoryInstruments"|"IntermediateNeuroImplants"|"IntermediateBioSuites"|"IntermediateTechsMonument1"|"IntermediateTechsMonument2"|"IntermediateTechsMonument3"|"IntermediateTechsMonument4"|"IntermediateTownAcquisition"} IntermediateLevel
 * @typedef {"Small"|"Medium"|"Big"} IslandSize
 * @typedef {"Normal"|"Underwater"|"Orient"|"Oxident"|"Water"|"Storm"|"Tsunami"} IslandType
 * @typedef {"Building"|"Military"|"Ship"|"Credit"|"Cleaner"|"Dividend"} MaintenanceType
 * @typedef {"North"|"South"|"Both"} MatchingClime
 * @typedef {"CriticalMissing"|"Burning"|"Infected"|"Crime"|"CrimeVisited"|"Sandstorm"|"EnemyMilitary"|"MoraleDemandMissing"} MoraleBlocker
 * @typedef {"None"|"Combat"|"LocalDisaster"|"GlobalDisaster"} MusicEventType
 * @typedef {"Empty"|"musiclist_oxident"|"musiclist_orient"|"start_habour_orient"|"start_harbour_occident"|"start_harbour_corsair_lair"|"thirdparty_karawanserei"|"thirdparty_mountain"|"thirdparty_place_of_pilgrimage"|"thirdparty_excavation_site"|"thirdparty_alchemists_tower"|"thirdparty_the_old_tree"|"thirdparty_academy_of_wisdom"|"thirdparty_black_castle"|"thirdparty_assassins_fortress"|"imperial_cathedral"|"sultans_mosque"} MusicListType
 * @typedef {"Tree"|"Stone"|"Grass"|"Mountain"|"Overbuildable"|"MinePath"|"Bush"} NatureType
 * @typedef {"NotNeeded"|"LevelMaintaining"|"UpgradeRelevant"} NeedKind
 * @typedef {"Moisture"|"Green"|"Saturated"} NoriaTextures
 * @typedef {"StealthEffect"|"StealthDetectionEffect"|"MissileLauncherArmed"|"ObjectGroupIndex"|"GhostStealthEffect"|"GhostDetectionEffect"} ObjectCounter
 * @typedef {"Explorable"|"NotHijackable"|"DestroyByExplosion"|"NoEmpTarget"|"RenderOutlineWithZBias"} ObjectFlag
 * @typedef {"Terrain"|"Water"|"None"|"Seabed"|"Lake"|"TerrainOnRender"|"Submarine"} ObjectPlacement
 * @typedef {"Nothing"|"Coast"|"Harbour"|"River"|"Dam"|"HarbourOrCoast"|"Geothermical"} ObjectPosition
 * @typedef {"StealthEffect"|"StealthDetectionEffect"} ObjectStatusCounter
 * @typedef {"Handle"|"Feedback"|"Simple"|"Nature"|"Grass"} ObjectType
 * @typedef {"North"|"East"|"South"|"West"} Orientation
 * @typedef {"NoOverlap"|"EcoBalance"|"WindEnergy"|"Cogeneration"|"Wasteincinerator"} OverlapType
 * @typedef {"payable"|"missingMoney"|"missingBuildMaterial"|"missingManpower"|"missingItems"} PayableType
 * @typedef {"Credits"|"Licences"} PlayerResource
 * @typedef {"Empty"|"Human"|"Computer"|"Neutral"|"Faction"} PlayerType
 * @typedef {"Few"|"Some"|"Lot"} PotentialHonour
 * @typedef {"NoProduct"|"BuildingModules"|"Tools"|"Wood"|"Glass"|"Concrete"|"Steel"|"Carbon"|"Fish"|"ComfortFood"|"HealthFood"|"TVDinner"|"LuxuryMeal"|"FunctionalFood"|"Tea"|"HealthDrink"|"Liquor"|"Champagne"|"EnergyDrink"|"Toys"|"Jewelry"|"Pharmaceuticals"|"Communicator"|"Holographer"|"HomeRobot"|"Coal"|"Granulate"|"IronOre"|"Iron"|"Copper"|"Limestone"|"Sand"|"RawOil"|"Oil"|"Microchips"|"Sugar"|"ManganeseNodules"|"RareEarths"|"Diamonds"|"Uranium"|"Meat"|"SuperFlavor"|"Explosives"|"Lobster"|"Truffles"|"Grapes"|"GoldNuggets"|"Gold"|"OmegaAcids"|"SecretIngredient"|"Soy"|"Vegetables"|"Fruits"|"Milk"|"Grain"|"Flour"|"Corn"|"Biopolymer"|"Caffeine"|"Algae"|"FuleRod"|"Kerosene"|"Weapons"|"HeavyWeapons"|"AdvancedWeapons"|"CoralExtract"|"LaboratoryInstruments"|"NeuroImplants"|"BioSuites"|"Enzymes"|"Platinum"|"Sponges"|"Lithium"|"EnergyCells"|"Exoskeleton"|"Coral"} Product
 * @typedef {"Farmland"|"Desert"|"WrongZone"} Productivity
 * @typedef {"NoType"|"BuildMaterial"|"FinalGood"|"IntermediateGood"|"Weapon"} ProductType
 * @typedef {"EarlyGame"|"MidGame"|"LateGame"|"EndGame"} ProgressLevel
 * @typedef {"Nothing"|"MovingIn"|"MovingOut"} ResidentActivity
 * @typedef {"EcosRuin"|"Ecos1"|"Ecos2"|"Ecos3"|"Ecos4"|"TechsRuin"|"Techs1"|"Techs2"|"Techs3"|"TycoonsRuin"|"Tycoons1"|"Tycoons2"|"Tycoons3"|"Tycoons4"|"TotalResidents"} ResidentLevel
 * @typedef {"none"|"very_unhappy"|"unhappy"|"neutral"|"happy"|"very_happy"} ResidentSatisfaction
 * @typedef {"Mine"|"River"|"Dam"|"BlackSmoker"|"Lobster"|"UnderwaterOil"|"UnderwaterRubble"|"None"|"Geothermical"} ResourceKind
 * @typedef {"Coal"|"Iron"|"Limestone"|"Copper"|"Uranium"|"Basalt"|"RecyclableMaterials"|"Oil"|"Lobster"|"Gold"|"Sand"|"Platinum"} ResourceType
 * @typedef {"Intro"|"OutroWin"|"OutroLost"} ScenarioCutsceneType
 * @typedef {"default"|"stand01"|"stand02"|"stand03"|"sleep01"|"sleep02"|"sleep03"|"idle01"|"idle02"|"idle03"|"idle04"|"idle05"|"idle06"|"idle07"|"idle08"|"idle09"|"idle10"|"walk01"|"walk02"|"walk03"|"walk04"|"walk05"|"walk06"|"walk07"|"walk08"|"walk09"|"walk10"|"start01"|"stop01"|"run01"|"run02"|"die01"|"die02"|"fight01"|"fight02"|"fight03"|"fight04"|"fight05"|"fight06"|"fight07"|"fight08"|"fight09"|"fight10"|"fight11"|"fight12"|"fight13"|"fight14"|"fight15"|"fight16"|"work01"|"work02"|"work03"|"work04"|"work05"|"work06"|"work07"|"work08"|"work09"|"work10"|"cheer01"|"cheer02"|"cheer03"|"look_at01"|"look_at02"|"look_at03"|"homage01"|"homage02"|"homage03"|"greet01"|"greet02"|"greet03"|"buy01"|"talk01"|"talk02"|"talk03"|"romance01"|"romance02"|"protest01"|"protest02"|"portrait_menue01"|"clearfire_fight01"|"clearfire_fight02"|"clearfire_walk01"|"clearfire_walk02"|"panicrun01"|"panicrun02"|"demo_walk01"|"demo_walk02"|"demo_stand01"|"portrait_idle_very_friendly"|"portrait_idle_friendly"|"portrait_idle_neutral"|"portrait_idle_angry"|"portrait_idle_very_angry"|"portrait_talk_very_friendly"|"portrait_talk_friendly"|"portrait_talk_neutral"|"portrait_talk_angry"|"portrait_talk_very_angry"|"drunk_walk01"|"drunkduo_stand01"|"drunkduo_stand02"|"drunkduo_walk01"|"drunkduo_walk02"|"drunkduomix_stand01"|"drunkduomix_walk01"|"donate01"|"ornament01"|"ornament02"|"ornament03"|"ornament04"|"ornament05"|"ornament06"|"ornament07"|"ornament08"|"ornament09"|"ornament10"|"special01"|"special02"|"special03"|"special04"|"laydown01"|"laydown02"|"laydown03"|"dance01"|"dance02"|"dance03"} Sequence
 * @typedef {"None"|"Move"|"OnExpedition"|"WhiteFlag"|"LetterOfMarque"|"PowderKeg"|"Traderoute"|"Escort"|"Patrol"|"Fight"|"Submerged"|"AirshipLanded"|"AirshipFuelLow"} ShipState
 * @typedef {"TurnToTargetPos"|"TurnToWind"|"TurnToWindClockwise"|"TurnToFarm"} SubObjectBehaviour
 * @typedef {"My"|"Target"|"DisableTarget"} TargetType
 * @typedef {"None"|"Aquanaut"|"Pirate"} ThirdPartyIslandType
 * @typedef {"StrictTimetable"|"ExactTrade"|"OneShot"} TraderouteType
 * @typedef {"Warehouse"|"Ship"} UpgradeTarget
 * @typedef {"Land"|"Water"|"River"|"Air"|"Submarine"|"Seabed"|"OnlyStreet"|"PreferStreet"|"Size_1X1"|"HumanMovement"|"ShipMovement"} WalkingType
 * @typedef {"UnderWater"|"Water"|"Air"} WorldLayer
 * @typedef {"AllReputationLimitsReached"} AchievementCondition
 * @typedef {"Created"|"Lost"|"Destroyed"|"StreetBuilt"|"MissionSolved"|"DisasterStarted"|"EnergyProduced"|"EcoBalanceIncreased"|"EcoBalanceDecreased"|"MissionSolvedEasy"|"MissionSolvedMedium"|"MissionSolvedHard"|"Exploded"|"QuestMailReceived"|"DisasterImpact"|"Demolished"|"DisasterComponentStarted"|"MissionPlayingTime"|"MissionSolvedMinTime"|"MissionStartedMultiplayer"|"MissionSolvedMultiplayer"|"MissionStarted"|"DestroyedByEnemy"|"MissionPointsMax"|"ResidentsMax"|"TechMonumentMinTime"|"EcoMonunmentMinTime"|"TycoonMonumentMinTime"|"BalanceMax"|"Tech01MinTime"|"Tech02MinTime"|"Tech03MinTime"|"Tycoon01MinTime"|"Tycoon02MinTime"|"Tycoon03MinTime"|"Tycoon04MinTime"|"Eco01MinTime"|"Eco02MinTime"|"Eco03MinTime"|"Eco04MinTime"|"BeatenKetoMinTime"|"BeatenStrindbergMinTime"|"BeatenHectorMinTime"} AssetCounter
 * @typedef {"PlayerCounter"|"AssetCounter"|"ProfileCounter"|"FeatureCounter"|"QuestCounter"|"ProductCounter"} Counters
 * @typedef {"ItemUsed"|"DiplomacyActionUsed"|"ItemCreated"|"ItemGot"|"Activated"} FeatureCounter
 * @typedef {"EcoBalance"|"Buildings"|"EnergyLevel"|"EnergyProduction"|"EnergyConsume"|"CorruptedFertilities"|"BlackTidesActive"|"EndlessResources"|"Trees"|"FiniteResources"|"Shares"|"TechLevel2Residents"} IslandCounter
 * @typedef {"Low"|"Normal"|"Many"} NativeProductAmount
 * @typedef {"Failed"|"Few"|"Normal"|"Many"} NativeRewardPool
 * @typedef {"AddPrimaryTarget"|"RemovePrimaryTarget"} ObjectAction
 * @typedef {"HasEnoughFarmfields"|"IsProducing"|"CanDive"|"HasMarketPlaceConnection"|"HasWarehouseConnection"|"IsInfluencingResidentBuildings"} ObjectCondition
 * @typedef {"MovedShip"|"IslandDiscovered"|"UsedPassiveTrade"|"PricesTooLow"|"TransportRouteCreated"|"PricesTooHigh"|"UsedPatrol"|"UsedEscort"|"ItemGot"|"UsedSeed"|"TurnedOffAutomaticUpgrade"|"OrientDiscovered"|"InfoBarEdited"|"HelperQuestStarted"|"UsedUnderWaterCamera"|"MoraleChanged"|"QuestGained"|"StatusQuestGained"|"RelationQuestGained"|"LongDistanceRocketWithoutDamage"|"LongDistanceRocketWithSingleTarget"} PlayerAction
 * @typedef {"BurningHouses"|"InfectedHouses"|"DamagedVehicles"|"DamagedHouses"|"TransportRoutes"|"SolvedQuests"|"FailedQuests"|"KilledVehicles"|"Credits"|"FreeUpgradeRights"|"DiscoveredIslands"|"OtherLivingPlayers"|"ColonizedIslands"|"Vehicles"|"Balance"|"Residents"|"WarVehicles"|"Enemies"|"KilledHumans"|"MaleComputerPlayersKilled"|"FemaleComputerPlayersKilled"|"TreesBuilt"|"StreetsBuilt"|"EcoBalance"|"EcoResidentBuildings"|"TycoonResidentBuildings"|"TechResidentBuildings"|"EcoResidents"|"TycoonResidents"|"TechResidents"|"DiplomacyActionsUsed"|"TradeAmount"|"ContinuousGamesStarted"|"ContinuousGamesCompleted"|"ContinuousPresetsStarted"|"ContinuousPresetsCompleted"|"ChallengeMissionsStarted"|"ChallengeMissionsCompleted"|"WorldEventMissionsStarted"|"WorldEventMissionsCompleted"|"ConquestMissionsStarted"|"ConquestMissionsCompleted"|"CampaignMissionsStarted"|"CampaignMissionsCompleted"|"EasyMissionStarted"|"KilledProfiles"|"ItemsUsed"|"BuildingsBuilt"|"ShipsBuilt"|"SubmarinesBuilt"|"AirshipsBuilt"|"FinalGoodsProduced"|"EcoLevel1Residents"|"EcoLevel2Residents"|"EcoLevel3Residents"|"EcoMaxLevelResidents"|"TycoonLevel1Residents"|"TycoonLevel2Residents"|"TycoonLevel3Residents"|"TycoonMaxLevelResidents"|"TechLevel1Residents"|"TechLevel2Residents"|"BuildingsTakenOver"|"WarDeclared"|"MobileBuildingsReplaced"|"MaxOrnamentalBuildingsOnIsland"|"ColonizedUnderwaterIslands"|"UsedDivingAction"|"GoodsProduced"|"EnergyProduced"|"EcoBalanceIncreased"|"EcoBalanceDecreased"|"DiscoveredUnderwaterIslands"|"CrimeInfluencedBuildings"|"TradeIncome"|"TradeExpense"|"TradeBalance"|"StartedWithEcos"|"StartedWithTycoons"|"DiplomacyPointsSpent"|"MonumentsBuilt"|"Buildings"|"DestroyedMilitaryPoints"|"ItemsCreated"|"MaxLevelResidents"|"DestroyedBuildings"|"ResourcesCollected"|"OwningIslandPercentage"|"UsedImport"|"ChangedMediaChannel"|"DiscoveredPlayers"|"MissionPoints"|"ModulesCreated"|"DevsCreated"|"ArkItemsUsed"|"NuclearMissilesLaunched"|"ArkRelocated"|"WorldPatronActionsUsed"|"ArkGoodsOrdered"|"VehiclesBought"|"DiplomacyPointsGained"|"PlayingTime"|"AchievementsGained"|"TimeForTycoonLevel1"|"TimeForTycoonLevel2"|"TimeForTycoonLevel3"|"TimeForTycoonLevel4"|"TimeForEcoLevel1"|"TimeForEcoLevel2"|"TimeForEcoLevel3"|"TimeForEcoLevel4"|"TimeForTechsLevel1"|"TimeForTechsLevel2"|"ScreenshotsTaken"|"GamePaused"|"UsedHijackerItem"|"UsedHijackerStealItem"|"MissionsStartedEasy"|"MissionsStartedMedium"|"MissionsStartedHard"|"FormulasDiscovered"|"GamesStarted"|"MilitaryPointsUsed"|"UsedDetonatorItems"|"UsedDisasterControlItems"|"UsedEMPItems"|"UsedExpeditionItems"|"UsedLetterOfMarqueItems"|"UsedResourceFillItems"|"UsedSeedItems"|"UsedShieldItems"|"UsedStealthItems"|"UsedTollWaresItems"|"UsedWhiteFlagItems"|"None"|"SupportFleetUsed"|"ThirdPartyWaresBought"|"ThirdPartyWaresSold"|"ItemsBought"|"VehiclesBuilt"|"DestroyedSubmarines"|"DestroyedShips"|"DestroyedAirships"|"SolvedDailyQuests"|"SolvedDeliveryQuests"|"SolvedEscortQuests"|"SolvedExplorerQuests"|"SolvedFleetQuests"|"SolvedHuntingQuests"|"SolvedLightTrackingQuests"|"SolvedPuzzlePictureQuests"|"SolvedRecoveryQuests"|"SolvedSmugglerQuests"|"SolvedTradingRaceQuests"|"SolvedTreasureHuntQuests"|"SolvedVehicleRescueQuests"|"SolvedVehicleThiefQuests"|"SolvedMapQuests"|"UsedArkItemSlots"|"InactiveBuildings"|"AverageEcoBalance"|"MilitaryStrength"|"ConsumedOil"|"MissionPointRank"|"Airships"|"Ships"|"Submarines"|"ActiveMediaChannels"|"TradingShips"|"DeniedQuests"|"MaxAirportSlotsUsed"|"VehiclesLost"|"MaxTransportRouteLength"|"BlackTideStartedDestroyShip"|"NegativeEnergyAfterChannelChange"|"UnhappyResidents"|"ResidentsInfluencedByMedia"|"LastMinuteQuestsSolved"|"TreesDestroyed"|"QuestsGained"|"SolvedResidentQuests"|"PlayingTimeEndlessGame"|"PlayingTimeEndlessGameEasy"|"PlayingTimeEndlessGameMedium"|"PlayingTimeEndlessGameHard"|"PlayingTimeScenario"|"PlayingTimeWorldEvent"|"PlayingTimeChallenge"|"PlayingTimeConquest"|"PlayingTimeCampaign"|"PlayingTimeCoop"|"PlayingTimeMultiplayer"|"ScenariosStarted"|"MultiplayerGamesStarted"|"CoopGamesStarted"|"OtherHumanPlayers"|"CameraTimeNear"|"CameraTimeMiddle"|"CameraTimeFar"|"CameraTimeUnderwaterNear"|"CameraTimeUnderwaterFar"|"PlayerProfileChanged"|"ThirdpartyIncome"|"SenateVotes"|"WorldPatronVotes"|"EcoBalanceWorld"|"MissileLaunchers"|"ProducedWares"|"QuestLicensesGot"|"UsedInvestment"|"UsedMoneyLender"|"UsedLargeStock"|"UsedPriceDumping"|"UsedCeaseFire"|"UsedCityProtection"|"UsedTradingrouteAgreement"|"SolvedGuidedEscortQuests"|"ItemValueCreated"|"LighhouseSettingUsed_01"|"LighhouseSettingUsed_02"|"LighhouseSettingUsed_03"|"TechLevel3Residents"|"ForeignIslandSharesBought"|"OwnIslandSharesBought"|"IslandsBought"|"EnergyTransmitted"|"UnderwaterTradingRoutes"|"TradeBalanceLicences"|"TimeForTechsLevel3"|"SeaMinesUsed"|"GhostStealthUsed"} PlayerCounter
 * @typedef {"CurrentGame"|"AllGames"} PlayerStatsLayer
 * @typedef {"Current"|"Min"|"Max"} PlayerStatsType
 * @typedef {"Fulfillment"|"Produced"} ProductCounter
 * @typedef {"PlayedWith"|"Killed"|"SolvedQuests"|"FailedQuests"|"TradeAmount"|"UsedDiplomacyActions"|"Discovered"|"DestroyedVehicles"|"DestroyedBuildings"|"ItemsSold"|"CreditsPayed"|"DiplomacyPoints"|"LastGameState"|"CharacterKilled"} ProfileCounter
 * @typedef {"None"|"Normal"|"Special"|"Deluxe"} ProfileReward
 * @typedef {"ResidentBuilding"|"FreePosition"|"UnderWater"} PuzzlePictureSpawnPosition
 * @typedef {"ProductionIslandNeeded"|"MaxPlayingTimeReached"|"HasMaxPlayingTime"|"NoWinconditions"|"FastGameSpeed"|"UnderwaterCameraActive"|"IsSinglePlayer"|"UsedAllMenuSlots"|"HasCoopPartner"|"IsMultiplayer"|"NoFullscreenMenuActive"|"HostileTakeOverEnabled"|"NoStatusQuestRunning"} QuestCondition
 * @typedef {"QuestStarted"|"QuestSolved"|"AchievementGained"|"QuestFailed"} QuestCounter
 * @typedef {"None"|"Easy"|"Normal"|"Hard"} QuestDifficulty
 * @typedef {"Started"|"Solved"|"Failed"} QuestEvent
 * @typedef {"None"|"ClientKontor"|"PlayerKontor"|"ClientWarehouse"|"AnyPlayerIsland"|"SpawnedShip"|"QuestObject"|"ClientShip"|"PlayerArk"|"ClientArk"|"Default"|"PlayerHarbour"|"PlayerResidentIsland"|"PlayerResidentIslandHarbour"} QuestExecutionPlace
 * @typedef {"IgnorePointsIfNotStarted"|"CollectVictoryConditions"|"FailWhenDenying"|"HideIfReachedAtStart"|"HiddenQuest"|"HideQuestArrow"|"LateEntry"|"HideInQuestLog"|"EnableUnderwaterCamera"|"AlwaysCheckPreconditions"|"NoSelectInvitation"|"ForceReminder"|"KeepQuestWares"|"ForceGotoExecutionPlace"|"AllowQuestAbort"|"DisableReminder"|"HideInactiveSubquests"|"IgnoreCutScene"|"HideIfWinconditionsSet"|"CheckLocally"|"PreventObjectDemolition"|"AlwaysCheckWinconditions"} QuestFlag
 * @typedef {"None"|"PuzzlePicture"|"MapIsland"|"TreasureHunt"|"RobinsonCrusoe"|"CatchShip"|"Fleet"|"Escort"|"ShipBlockade"|"GetWares"|"KillCorsairShips"|"KillShips"|"ShipAccident"|"CallForHelp"|"TradingRace"|"Recovery"|"LightTracking"|"Smuggler"|"Explorer"|"RequestPeace"|"CastAway"|"GuidedEscort"} QuestMission
 * @typedef {"Default"|"Local"|"Global"} QuestMultiplayerBehaviour
 * @typedef {"Start"|"Main"|"End"} QuestProgress
 * @typedef {"A"|"B"|"C"|"D"|"E"|"F"|"Z"} QuestRewardPriority
 * @typedef {"ExecutionPlace"|"QuestSender"} QuestTooltip
 * @typedef {"SideQuest"|"MainQuest"|"HelperQuest"|"WinQuest"|"LoseQuest"|"FollowUpQuest"|"DummyQuest"|"StoryQuest"|"Job"|"DecisionQuest"|"ThirdPartyReaction"|"DefeatQuest"|"RelationQuest"|"StatusQuest"|"PeaceQuest"|"KillQuest"|"ConquestModeQuest"|"ProtestQuest"|"PartialLoseQuest"} QuestType
 * @typedef {"None"|"Less"|"VeryLess"|"Normal"|"Much"|"VeryMuch"|"Ultra"} RewardAmount
 * @typedef {"Any"|"QuestReceiver"|"QuestSender"} SelectedObjectOwner
 * @typedef {"ClientKontor"|"PlayerKontor"|"ThirdParty"|"ClientArk"} ShipBlockadeTarget
 * @typedef {"Predator"|"Influence"|"Disaster"} DangerType
 * @typedef {"All"|"FishingSpot"} DummyStatus
 * @typedef {"DiseaseBarrier"|"CrimeBarrier"} FeedbackAddOnObject
 * @typedef {"Rebel"|"Firefighter"|"Doctor"|"Police"|"BuildingFeedbackRunning"} FeedbackBuildingState
 * @typedef {"All"|"Marketplace"|"Public"|"Street"} FeedbackBuildingType
 * @typedef {"Church"|"Talk"|"Greet"|"Marketplace"|"Protest"|"Fire"|"TalkAtPlace"|"LookAt"|"FleeFromMilitary"|"EditorFeedback"|"Idle"|"GoHome"|"Tornado"|"Attract"} FeedbackEvent
 * @typedef {"None"|"OnlySamePlayer"|"OnlyOtherPlayer"} FeedbackPlayerIDRestriction
 * @typedef {"Min"|"Low"|"Medium"|"High"|"Max"} FeedbackQuality
 * @typedef {"MinDistance"|"MaxDistance"} FeedbackRadius
 * @typedef {"Default"|"Work"|"Construct"|"Deconstruct"|"Fire"|"Hijack"|"Protest"|"Disease"} FeedbackSequence
 * @typedef {"None"|"Man"|"Woman"|"Boy"|"Girl"|"Beggar"|"Vehicle"} FeedbackUnitType
 * @typedef {"Greet"|"Cheer"|"Dance"|"Homage"|"Protest"|"Mob"|"Buy"|"LookAt"|"Pet"|"Demo"} IndividualFeedback
 * @typedef {"IntervalMin"|"IntervalMax"} OccurrenceCondition
 * @typedef {"OffsetX"|"OffsetZ"} RadiusOffset
 * @typedef {"Idle"|"Unassigned"} UnitFlag
 * @typedef {"None"|"Easy"|"Medium"|"Hard"} AIDifficulty
 * @typedef {"None"|"MG_Profile_Progress"|"MG_Profile_Progress_complete"|"MG_Selection_Unplayed"|"MG_Selection_Recognition_Friendly"|"MG_Selection_Recognition_Angry"|"MG_Open_World_Statistics"|"MG_Change_Cancelled"|"MG_Change_Saved"|"MG_Ark_Item_Upgrade"|"First_Contact"|"Welcome_Friendly"|"Welcome_Angry"|"Quest_Offered"|"Quest_Get_Peace_Offered"|"Quest_Avoid_War_Offered"|"Quest_Decision_Offered"|"Quest_Relation_Offered_Friend"|"Quest_Unlock_PopulationGroup_Started"|"Quest_Reminder"|"Quest_Invitation_Started"|"Quest_Failed_Or_Invitation_Cancelled"|"Quest_Finished"|"Quest_Finished_Friend"|"Quest_Finished_Foe"|"Quest_Decision_Finished_for_Other"|"Progress_Positive"|"City_Level_Reached_Positive"|"Colony_Established_Positive"|"Colony_At_TP_Positive"|"Building_Built_Positive"|"Monument_Built_Positive"|"Building_Demolished_Positive"|"Progress_Negative"|"City_Level_Reached_Negative"|"Colony_Established_Negative"|"Colony_At_TP_Negative"|"Building_Built_Negative"|"Monument_Built_Negative"|"Building_Demolished_Negative"|"Affirmation"|"Positive_Reaction"|"Ship_Select_Positive"|"Building_Select_Positive"|"Science_Produced_Positive"|"Media_Broadcasted_Positive"|"Rejection"|"Negative_Reaction"|"Ship_Select_Negative"|"Building_Select_Negative"|"Science_Produced_Negative"|"Media_Broadcasted_Negative"|"Trading_Menu_Activated"|"Vehicle_Trade_Activated_Buy"|"Vehicle_Trade_Activated_Sell"|"Shipment_Started"|"Trading_Finished"|"TP_Trading_Finished"|"Worldpatron_Open"|"Wares_Traded"|"Trading_Cancelled"|"No_Trade"|"Merchantfleet_Started"|"Function_Unlocked"|"Function_Started"|"Function_Running"|"Function_Finished"|"Function_Failed"|"Function_Not_Available"|"Accept_Peace_Offer"|"Peace_With_Friend"|"War_With_Foe"|"Foe_Attacked_Or_Killed"|"Decline_Peace_Offer"|"Confirm_War"|"Peace_With_Foe"|"War_With_Friend"|"Friend_Attacked_Or_Killed"|"Smalltalk_Self"|"Smalltalk_Faction"|"Smalltalk_Others"|"TP_Declare_War"|"TP_Offers_Peace"|"TP_Pays_Credits"|"TP_Demands_Credits"|"TP_Receive_Credits"|"Diplomacyaction_Started_General"|"Diplomacyaction_Started_Unique"|"Diplomacyaction_Finished"|"Diplomacyaction_Failed"|"Diplomacyaction_Started_In_War"|"Military_Positive"|"Military_Unit_Built_Positive"|"Defensive_Structure_Built_Positive"|"Offensive_Structure_Built_Positive"|"TP_Win_Fight"|"TP_Destroys_Military_Object"|"TP_Troops_In_Influence"|"TP_Attacks_Unit"|"TP_Defeated"|"Player_Defeated"|"Military_Negative"|"Military_Unit_Built_Negative"|"Defensive_Structure_Built_Negative"|"Offensive_Structure_Built_Negative"|"TP_Lose_Fight"|"Player_Destroys_Military_Object"|"Player_Troops_In_Influence"|"Player_Attacks_Unit"|"Helperquest_Started_General"|"Helperquest_Finished_General"|"MG_Mailsystem_Demand"|"MG_Mailsystem_Important_Information"|"MG_Senate_New_Vote"|"MG_Senate_New_Vote_Unique"|"MG_Voted_For_Faction"|"MG_Vote_Running"|"MG_Vote_Finished"|"MG_Mission_Success"|"MG_Mission_Failed"|"Ministry_of_Truth_Message"|"Diplomacyaction_Invitation"|"Function_Unlocked_2"|"Function_Started_2"|"Function_Reminder_2"|"Function_Running_2"|"Function_Finished_2"|"Function_Failed_2"|"Function_not_available_2"|"Function_Shutdown_2"|"Function_Unlocked_3"|"Function_Started_3"|"Function_Reminder_3"|"Function_Running_3"|"Function_Finished_3"|"Function_Failed_3"|"Function_not_available_3"|"Function_Shutdown_3"|"Function_Unlocked_4"|"Function_Started_4"|"Function_Reminder_4"|"Function_Running_4"|"Function_Finished_4"|"Function_Failed_4"|"Function_not_available_4"|"Function_Shutdown_4"|"Quest_Relation_Offered_Foe"|"Diplomacyaction_Finished_Unique"|"Diplomacyaction_Started_in_War_Unique"|"Function_Invitation"|"Function_Invitation_Cancelled"|"MG_Daily_Quest_Available"|"MG_No_Daily_Quest_Available"|"MG_Event"|"Get_Dossier"|"World_Patron_Action01"|"World_Patron_Action02"|"World_Patron_Action03"|"World_Patron_Action04"|"MG_WorldPatron_New_Vote"|"Ark_Storage_Open"|"Victory_Quest_Offered"|"Victory_Quest_Finished"|"Negative_Reaction_Rocket_Launch_others"|"Negative_Reaction_Rocket_Launch_self"|"Function_Invitation_2"|"Investment_Success"|"Investment_Neutral"|"Investment_Failed"|"Eco_Balance_high"|"Eco_Balance_low"|"FollowUp_Quest_Offered"|"Function_Invitation_3"|"Monitoring_station_selected"|"Resident_Quest_Offered"|"Resident_Quest_Reminder"|"Resident_Quest_Invitation_Started"|"Resident_Quest_Failed_or_Invitation_Cancelled"|"Resident_Quest_Finished"|"Resident_Status_Quest_Offered"|"Resident_Disaster_Quest_Offered"|"Resident_Talk_Angry"|"Resident_Talk_Unhappy"|"Resident_Talk_Balanced"|"Resident_Talk_Happy"|"Resident_Talk_Euphoric"|"Resident_Affirmation"|"Resident_Rejection"|"Resident_Positive_Reaction"|"Resident_Negative_Reaction"|"Resident_Military_Negative"|"Resident_DiplomacyAction_Started"|"Resident_DiplomacyAction_Started_in_War"|"Resident_DiplomacyAction_Invitation"|"Resident_DiplomacyAction_Finished"|"Resident_DiplomacyAction_Failed"|"Resident_Channel_Reaction"|"Resident_Welcome_Friendly"|"Resident_Welcome_Angry"|"MG_Profile_Creation"|"Ark_Items_Upgrade_Open"|"Loot_Defeated_TP_Start"|"Loot_Defeated_TP_Finished"|"Quest_Unlock_PopulationGroup_Finished"|"First_Contact_Unlocked_Faction"|"Welcome_Friendly_Unlocked_Faction"|"World_Patron_Action_General"} AudioPool
 * @typedef {"A"|"B"|"C"|"D"|"E"} AudioPriority
 * @typedef {"Buildings"|"MilitaryBuildings"|"TradingShips"|"MilitaryShips"|"Resources"|"Fertilities"|"NeutralBuildings"|"GoldAmount"|"CivilizationLevel"|"Peasant"|"Citizen"|"Patrician"|"Nobleman"|"Honour"|"Enemies"|"Allies"|"Disasters"|"Talents"|"Nomad"|"Ambassador"|"Islands"} CompetenceCategory
 * @typedef {"Normal"|"Military"} CompetenceType
 * @typedef {"PeacePact"|"TradePact"|"AlliancePact"|"PayTribute"|"MilitaryStronger"|"MilitaryWeaker"|"DeclareWar"|"OrderTribute"|"OfferPeace"|"OfferCredit"|"BegForPeace"|"OrderMilitarySupport"|"IsCrazy"|"IsSuperior"|"ExecuteAssistance"|"DemandForAssistance"|"ForceTreaty"|"OfferPeacePact"} CompetenceUsage
 * @typedef {"ItemShuffle"|"Renegade"|"GiveUpBuilding"} DiplomacyCounter
 * @typedef {"Eco"|"Tycoon"|"Tech"|"None"} Faction
 * @typedef {"SwapGUIDS"|"ExcludeFromGUIDS"|"ExcludeToGUIDS"} FeedbackBehaviourFlags
 * @typedef {"ECO"|"OILBARON"|"SUPPORTER"|"RIVAL"|"SCIENTIST"} HarbourType
 * @typedef {"Level1"|"Level2"|"Level3"|"Level4"} HouseLevelGUID
 * @typedef {"Misc"|"Diplomacy"|"Trade"|"Quests"|"Comments"|"Special"|"PlayerActions"|"NeutralBuilding"|"Settlement"|"Monument"|"Beggars_Bandits"|"DiplomacyActions"|"Unused"} MessageCategory
 * @typedef {"Default"|"Bad"|"Neutral"|"Good"} Mood
 * @typedef {"Player"|"Pirate"|"GlobalEnemy"|"Resident"} Nation
 * @typedef {"None"|"Harbour"|"Trade"|"Honor"|"WareProduction"|"PassiveSupport"|"UnitProduction"} NeutralBuildingType
 * @typedef {"WarImpossible"|"RepairVehicles"|"NotAttackable"|"DisableTrade"|"TradeVehiclesNotAttackable"|"CityNotAttackable"|"DisableAirshipAttack"} PlayerFlag
 * @typedef {"Expand"|"ActiveTrade"} PlayerFunction
 * @typedef {"War"|"Peace"|"HasJob"|"HasNoJob"|"Found"} PlayerState
 * @typedef {"BUDGETCOUNT"|"HUMANISLANDCOUNT"|"TRANSPORTERCOUNT"|"ALLCOMPLETE"|"ASKHUMANPLAYER"} ProgressLevelCategory
 * @typedef {"Neutral"|"Negative"|"Positive"|"Center"|"IncreaseToCenter"|"DecreaseToCenter"} Regression
 * @typedef {"Level1"|"Level2"|"Level3"|"Level4"} ReputationLevel
 * @typedef {"Male"|"Female"} Sex
 * @typedef {"None"|"Player"|"Self"|"Third"} ThirdPartyExecutor
 * @typedef {"GiveUpBuilding"|"Cleaner"|"ShuffleItems"} ThirdpartyFunction
 * @typedef {"None"|"IncreaseReputation"|"DecreaseReputation"|"DeclareWar"|"CallForHelp"|"EnableShipTrade"|"DisableShipTrade"|"SetPeace"|"StartIceAge"|"EnableProductionArea"|"DisableProductionArea"|"EnableDialogVariation"|"DisableDialogVariation"|"FreeProductionArea"|"DestroyProductionArea"|"AlwaysSuccessDialogVariation"|"AlwaysFailDialogVariation"|"EnableTargetSearch"|"DisableTargetSearch"|"EnableExplore"|"StartProtest"} ThirdPartyReaction
 * @typedef {"NONE"|"ACTIVATE_KONTOR"|"ACTIVATE_KONTOR_FIRST_TIME"|"ACTIVE_TRADE_CANCELLED"|"RETREAT"|"AI_WANT_ISLAND"|"ATTACK_UNIT"|"COLONY_ESTABLISHED"|"COLONY_AT_CPU"|"CREDIT_PAYED"|"DIPLOMACY_MENU_SELECTED"|"DIPLOMACY_TALK"|"FIRST_CONTACT"|"HELP_ENEMY_UNIT_KILLED"|"ICEAGE_FINISHED"|"ICEAGE_RUNNING"|"ICEAGE_STARTED"|"KONTOR_TALK"|"KILLED"|"QUEST_FAILED"|"QUEST_FINISHED"|"QUEST_INVITATION_CANCELLED"|"QUEST_NO_SPACE"|"QUEST_REMINDER"|"QUEST_STARTED"|"QUEST_DECISION_FAILED"|"QUEST_DECISION_FINISHED"|"QUEST_DECISION_STARTED"|"QUEST_INVITATION_STARTED"|"SCENARIO"|"SHIP_SELECT"|"TRADING_FINISHED"|"TRADING_MENU_NOWARES"|"TRADING_MENU_ACTIVATED"|"TRADING_TALK"|"UNITS_IN_INFLUENCE"|"WARES_TRADED"|"STARTMESSAGE_NORMAL"|"STARTMESSAGE_EASYMODE"|"MAINMENU_SMALLTALK"|"TREATY_OFFERED"|"TREATY_OFFERED_TRIBUTE"|"TREATY_OFFERED_CREDIT"|"TREATY_ACCEPTED"|"TREATY_DENIED"|"TREATY_DENIED_TRIBUTE"|"TREATY_DISSOLVED"|"TREATY_DISSOLVED_TRIBUTE"|"MERCHANTFLEET_START"|"TALK_ABOUT_CHARACTER"|"RESIDENT_TALK_01"|"RESIDENT_TALK_02"|"RESIDENT_TALK_03"|"RESIDENT_TALK_04"|"RESIDENT_TALK_05"|"SHIPBOARD_FINISHED"|"SHIPBOARD_STARTED"|"SHIPBOARD_STEAL"|"SELLSHIP_INVITATION"|"SELLSHIP_ACCEPTED"|"SELLSHIP_CANCELLED"|"BUYSHIP_INVITATION"|"BUYSHIP_ACCEPTED"|"BUYSHIP_CANCELLED"|"OBJECT_BUILD"|"UNIT_KILLED"|"OTHER_UNIT_KILLED"|"QUEST_DENIED"|"QUEST_FINISHED_PROFILE"|"ESCORTQUEST_INVITATION_STARTED"|"ESCORTQUEST_INVITATION_ACCEPTED"|"ESCORTQUEST_INVITATION_DENIED"|"ISCRAZY"|"WAR_WITH_RIVAL"|"WAR_WITH_FRIEND"|"PEACE_WITH_RIVAL"|"PEACE_WITH_FRIEND"|"QUEST_FINISHED_RIVAL"|"QUEST_FINISHED_FRIEND"|"RIVAL_KILLED"|"FRIEND_KILLED"|"MILITARYUNIT_PRODUCED"|"QUEST_STATION_FINISHED"|"QUEST_RACE_BEFORE"|"QUEST_RACE_BEHIND"|"QUEST_RACE_START"|"DIPLOMACYACTION_EXECUTED"|"DIPLOMACYACTION_FAILED"|"DIPLOMACYACTION_CANCELLED"|"DIPLOMACYACTION_INVITATION"|"DIPLOMACYACTION_ACTIVATED"|"DIPLOMACYACTION_SECOND_INVITATION"|"DIPLOMACYACTION_CONFIRMATION"|"DIPLOMACYACTION_OFFERED"|"DIPLOMACYACTION_FORCED"|"DIPLOMACYACTION_ACCEPTED"|"DIPLOMACYACTION_DENIED"|"DIPLOMACYACTION_ENDED"|"PLAYEROBJECT_SELECTED"|"OBJECT_SELECTED"|"RELATIONQUEST_STARTED_FRIEND"|"RELATIONQUEST_STARTED_RIVAL"|"RELATIONQUEST_FINISHED_FRIEND"|"RELATIONQUEST_FINISHED_RIVAL"|"QUEST_SMUGGLE_START"|"QUEST_SMUGGLE_INVITATION_STARTED"|"QUEST_SMUGGLE_INVITATION_CANCELLED"|"QUEST_LIGHTTRACKING_START"|"QUEST_LIGHTTRACKING_INVITATION_STARTED"|"QUEST_LIGHTTRACKING_INVITATION_CANCELLED"|"QUEST_TRADINGRACE_INVITATION_STARTED"|"QUEST_TRADINGRACE_INVITATION_CANCELLED"|"CHANNEL_REACTION"|"DISEASE_STARTED"|"DISEASE_FINISHED"|"TRIBUTE_WANTED"|"TRIBUTE_DENIED"|"TRIBUTE_PAYED"|"NO_TRADE"|"ENTER_MAP"|"LEAVE_MAP"|"SABOTAGE_FINISHED"|"PRODUCTION_BOOST"|"CLEANUP_STARTED"|"CLEANUP_RUNNING"|"CLEANUP_NOT_AVAILABLE"|"CLEANUP_INVITATION_STARTED"|"CLEANUP_INVITATION_CANCELLED"|"CLEANUP_FINISHED"|"FRIEND_ATTACKED"|"RIVAL_ATTACKED"|"BUILDING_CREATED_NEGATIVE"|"BUILDINGS_CREATED_POSITIVE"|"BUILDINGS_DEMOLISHED"|"INVESTMENT_SUCCESS"|"INVESTMENT_NEUTRAL"|"INVESTMENT_FAILED"|"MONOPOLY_ESTABLISHED"|"MONOPOLY_LOST"|"GIVEUPBUILDING_STARTED"|"GIVEUPBUILDING_INVITATION_STARTED"|"GIVEUPBUILDING_INVITATION_CANCELLED"|"MONUMENT_STARTED"|"MONUMENT_PART_FINISHED"|"MONUMENT_PART_INVITATION"|"MONUMENT_INVITATION_ACCEPTED"|"MONUMENT_INVITATION_CANCELLED"|"MONUMENT_BUILDING"|"MONUMENT_NOT_BUILDING"|"MONUMENT_IMPOSSIBLE"|"MONUMENT_FINISHED"|"QUEST_BOARDERS_DENIED"|"QUEST_BOARDERS_INVITATION"|"QUEST_BOARDERS_GOT"|"TRADED_WITH_FRIEND"|"TRADED_WITH_RIVAL"|"QUEST_AIRRACE_START"|"QUEST_AIRRACE_STATION_FINISHED"|"QUEST_UNDERWATERRACE_START"|"QUEST_UNDERWATERRACE_STATION_FINISHED"|"HELPERQUEST_STARTED"|"HELPERQUEST_FINISHED"|"STATUSQUEST_STARTED"|"STATUSQUEST_FAILED"|"STATUSQUEST_FINISHED"|"STATUSQUEST_INVITATION_STARTED"|"WORLDPATRONACTION_USED"|"SPECIALGOODSDELIVERY_INVITATION"|"SPECIALGOODSDELIVERY_ACCEPTED"|"SPECIALGOODSDELIVERY_CANCELLED"|"GAME_MENU_GOOD"|"GAME_MENU_BAD"|"GAME_MENU_NEUTRAL"|"RELICHUNTER_FINISHED"|"FOLLOWUPQUEST_STARTED"|"BOARDINGFEE_INVITATION"|"BOARDINGFEE_ACCEPTED"|"BOARDINGFEE_DENIED"|"DAILYQUEST_STARTED"|"DAILYQUEST_FINISHED"|"DAILYQUEST_IMPOSSIBLE"|"UNIT_KILLED_FRIEND"|"UNIT_KILLED_RIVAL"|"OWNING_OBJECT_SELECTED"|"WARQUEST_IMPOSSIBLE"|"ISLAND_DESTROYED"|"ASK_FOR_EXPANSION"|"ASK_FOR_EXPANSION_MONEY"|"EXPANSION_ALLOWED"|"EXPANSION_DENIED"|"QUEST_PROGRESS_UPDATE"|"ITEM_BOUGHT"|"ITEM_SOLD"|"OIL_TRADED"|"OIL_TRADED_OTHER_PLAYER"|"DISASTER_STARTED"|"OBJECT_DESTROYED"|"PROGRESS_QUEST_ABORTED"|"OBJECT_DEMOLISHED"|"BUY_SHARE_MAJORITY_IN_MY_TOWN"|"BUY_SHARE_IN_MY_TOWN"|"TAKEOVER_MY_TOWN"|"TOWNACQUISITION_ENABLED"|"QUEST_GUIDINGESCORT_ITEM_INVITATION"|"QUEST_GUIDINGESCORT_ITEM_DENIED"|"QUEST_GUIDINGESCORT_ITEM_GOT"|"QUEST_GUIDINGESCORT_STATION_FINISHED"|"BUILDING_SELECTED"|"TAKEOVER_HUMAN_CITY"|"TAKEOVER_THIRDPARTY_CITY"} ThirdPartyTrigger
 * @typedef {"War"|"Peace"} Treaty
 * @typedef {"CategoryName"|"AchievementCount"} AchievementCategoryText
 * @typedef {"StandardBody"|"DisabledBody"|"ActivatedBody"} AssortmentTooltip
 * @typedef {"Bad"|"OK"|"Good"} AudioQuality
 * @typedef {"Description"} BuffTooltip
 * @typedef {"HeaderAddOn"|"BuildingDescription"|"ConditionInfo"|"ConstructionInfo"} BuildingMenuTooltip
 * @typedef {"Description"} DiplomacyText
 * @typedef {"Name"|"Organisation"|"Entry"|"List"|"Behaviour"} DossierMail
 * @typedef {"New"|"Edit"|"Exported"|"PreFinal"|"Final"|"Revised"} EditingStatus
 * @typedef {"Tooltip"} GeneralTooltipFixed
 * @typedef {"Standard"|"Disabled"|"Activated"} GeneralTooltipSimple
 * @typedef {"StandardHeader"|"StandardBody"|"DisabledHeader"|"DisabledBody"|"ActivatedHeader"|"ActivatedBody"} GeneralTooltipTitled
 * @typedef {"Title"|"Chapter"|"Entry"|"Description"|"Topic01"|"Topic02"|"Topic03"|"Topic04"|"Topic05"} HelperquestMail
 * @typedef {"Description"} HelperquestMailDescription
 * @typedef {"Subtitle"|"Infotext"|"List"} HelperquestTopic
 * @typedef {"Subtitle"|"Infotext"|"Image"|"List"} HelperquestTopicImage
 * @typedef {"Description"} InfolayerStandardTooltip
 * @typedef {"FlavourText"} ItemText
 * @typedef {"German"|"English"|"French"|"Italian"|"Spanish"|"Chinese"|"Polish"|"Czech"|"Russian"|"EnglishUS"|"SpanishUS"|"FrenchUS"} Language
 * @typedef {"Salutation"|"Topic01"|"Topic02"|"Topic03"|"Topic04"|"Topic05"|"Signature"} MailContent
 * @typedef {"Text"|"Title"|"Image"|"Signature"} MailContentWorldEvent
 * @typedef {"Salutation"|"Introduction"|"ForwardedMailHeader"|"ForwardedMail"|"Signature"} MailForwarded
 * @typedef {"From"|"To"|"Date"|"Subject"} MailHeaderForwarded
 * @typedef {"ComplimentaryClose"|"Name"|"Organisation"|"Adress"|"Location"|"Mail"|"Icon"} MailSignature
 * @typedef {"Picture"|"TopicText"|"List"} MailTopic
 * @typedef {"DescriptionActive"|"DescriptionInactive"} MainMenuTooltip
 * @typedef {"Header"|"Buildcost"|"Description"} MonumentTooltip
 * @typedef {"Information"} NewsText
 * @typedef {"Info"|"QuestObjective"|"QuestSender"|"ExecutionPlace"|"Statement"|"TimeLimit"} QuestInfoText
 * @typedef {"Introduction"|"Reward Name"|"Description"|"Location"} RewardText
 * @typedef {"Reward Description"|"Reward Name"|"Location"} RewardTextBonusContent
 * @typedef {"Text"|"Standard"|"Disabled"|"Enabled"} TextLayoutDefinition
 * @typedef {} ThirdpartyMenuText
 * @typedef {"Message"} ToastText
 * @typedef {"StandardHeader"|"Row1"|"Row2"} TwoRowTableTitledTooltip
 * @typedef {} WorldPatronText
 * @typedef {"NOACTION"|"EXPLORE"|"COLLECT_FLOTSAM"|"COLLECT_FLOTSAM_2"|"SHIP_ATTACK"|"LAND_AT_AIRPORT"|"SHIP_ESCORT"|"SHIP_PATROL"|"SHIP_PATROL_START"|"WALK_TRADE"|"WALK"|"SHIP_HIJACK"|"SET_ASSEMBLY_POINT"|"WAREHOUSE_TRADE"|"TAKEOVER"|"SET_ASSEMBLY_POINT_NOCHECK"|"AREA_OF_EFFECT"|"NOTEMP_IN_A_SINGLE_MISSION"|"REPAIR_BUILDING"|"SHIP_HIJACK_FRIENDLY"|"RELOCATE_ARK"|"MISSILE_LAUNCHER_ASSEMBLY_POINT"|"FIRE_MOBILE_LAUNCHER"} ActionID
 * @typedef {"My"|"Foreign"|"Enemy"|"Pact"|"Neutral"|"CheckProperty"|"CheckNotProperty"|"CheckGUID"|"CheckNotGUID"|"AndNextMatch"|"OrNextMatch"|"AndNotNextMatch"|"OrNotNextMatch"|"Tree"|"Collectable"|"IsMoving"|"NotSelf"|"CheckBuildingType"|"SingleSelection"|"ActionsAreNotBlocked"|"CanTradeWithShip"|"Escortable"|"InShipTradingDistance"|"TradeTreaty"|"Explorable"|"Landable"|"IsTakeoverTarget"|"IsAttackableIgnoringTreaty"|"IsHijackable"|"IsHijackableIgnoringTreaty"|"IsBurning"} Matchflag
 * @typedef {"MyMatch"|"MyMatch2"|"MyMatch3"|"TargetMatch"|"TargetMatch2"|"TargetMatch3"|"DisableMatch"|"DisableMatch2"|"DisableMatch3"} MatchType
 * @typedef {"NoCursor"|"Normal"|"Normal_Flash"|"Build"|"Build_ani"|"Build_disable"|"Build_disable_resource"|"Delete"|"Delete_ani"|"Delete_disable"|"dnd_grab"|"dnd_hold"|"Move"|"Move_ani"|"Rotate"|"Pipette"|"Pipette_ani"|"Pipette_disable"|"DropGoods"|"pickup"|"Pickup_ani"|"Pickup_disable"|"Fight"|"Fight_ani"|"Fight_disable"|"Blank"|"Bomb"|"Bomb_ani"|"Bomb_disable"|"checkin"|"checkin_ani"|"checkin_disable"|"drop"|"drop_ani"|"drop_disable"|"follow"|"follow_ani"|"follow_disable"|"nobuild"|"nobuild_ani"|"normal_disable"|"normal_ani"|"scroll"|"Wait"|"Waypoint"|"Waypoint_ani"|"Waypoint_disable"|"dnd_hold_ani"|"hyperlink"|"hand_drop_disable_ani"|"normal_glow"|"Waypoint2_ani"|"Waypoint2_cur"|"Waypoint2_disable"|"Takeover"|"Takeover_ani"|"Takeover_disable"|"Ark"|"Ark_ani"|"Ark_disable"} Mousecursor
 * @typedef {"None"|"Land"|"Water"|"TradeNearby"|"MissileInRange"|"All"} PositionCheckType
 * @typedef {"None"|"Player"|"Handle"|"Fertility"|"BuildGUID"|"Position"} ActionTargetType
 * @typedef {"Others"|"Level1"|"Level2"|"Level3"|"Level4"|"Ornamental"} BuildingConstructionCategory
 * @typedef {"Production"|"ProductionFake"|"Public"|"Special"|"Infrastructure"|"Harbour"|"DisasterControl"|"Ornamental1"|"Ornamental2"|"Ornamental3"} BuildingConstructionGroup
 * @typedef {"Build"|"StopProduction"|"Cultivate"|"InstantPickup"|"BlockBuildMaterial"|"Upgrade"|"Refill"} ContextMenuAction
 * @typedef {"high"|"medium"|"low"} DiplomacyActionIntensity
 * @typedef {"Relative"|"Italic"|"Underline"|"StrikeOut"|"Weight"|"TextureFont"|"Shadow"|"DefaultColor"|"Outline"|"Antialiasing"} FontFlags
 * @typedef {"ConstructionCostRefund"|"IslandSize"|"Fertilities"|"Resources"|"QuestFrequency"|"CityDisaster"|"DisasterTornado"|"TechnologyDisaster"|"IslandEcoBalance"|"RandomSeed"|"DisasterFire"|"DisasterPlague"|"DisasterCrime"|"AddonActive"|"TownAcquisistion"|"VictoryConditionMode"|"VictoryConditionGoldEarned"|"VictoryConditionPopulation"|"VictoryConditionQuests"|"VictoryConditionMonuments"|"VictoryConditionEcoResidents"|"VictoryConditionTycoonResidents"|"VictoryConditionTechResidents"|"VictoryConditionTechMaxLevelResidents"|"VictoryConditionBalance"|"VictoryConditionMilitaryPoints"|"VictoryConditionIslandsSettled"|"VictoryConditionDevsCreated"|"VictoryConditionMissionPoints"|"VictoryConditionPlayedTime"|"VictoryConditionMilitaryDestroyed"|"VictoryConditionLastManStanding"|"MapDiscovered"|"StartCredit"|"StartLicences"|"StartWithWarehouse"|"StartingFleet"|"ArkStorage"|"InitialFactions"|"InitialPeaceDuration"} GameSettingGameWorld
 * @typedef {"Buildings"} ItemTargetCategory
 * @typedef {"Research"|"Seeds"|"Production"|"Special"|"Public"|"Energy"|"Ecology"|"Vehicles"} ItemTechnologyCategory
 * @typedef {"MoneyCost"|"ActiveCost"|"InactiveCost"|"Capacity"|"MaxHitpoints"|"VisionRadius"|"SlotCapacity"|"SlotCount"|"WalkingSpeed"|"InfluenceRadius"|"NewTreaty"|"ConstructionPlanObject"|"ProductCost"|"LoadDamageCap"|"SelfHealingPointsPerMinute"|"ShipDamagePerSecond"|"ShipAttackSpeed"|"ProductionCount"|"WorkerCount"|"RawNeeded1"|"ProductionTime"|"EffectDuration"|"CooldownDuration"|"TaxRate"|"MoraleBlocker"|"Livingspace"|"MoveInSpeed"|"ActiveEcoEffect"|"ActiveEnergyCost"|"ActiveEnergyProduction"|"ShieldEnergy"|"ShieldEnergyRegeneration"|"CombatAttackRange"|"ShipLimit"|"UnitLimit"|"DemandAmount"|"ResourceType"|"ResourceAmount"|"FuelConsumptionRate"|"AssetDiscoveryChance"|"EMPRange"|"EMPDuration"|"EcoBalance"|"CreatedMoneyAmount"|"CreatedLicenseAmount"|"UpgradeRights"|"BlackSmokerResult"|"AdditionalDisasterProbability"|"DecreaseDisasterProbability"|"AffectedResidents"|"UpgradeCost"|"DroneStrength"|"DemandQuote"|"FirefighterHealingPerMinute"|"DoctorHealingTime"|"PolicePursuitTime"|"BuildCostDisasterProbability"|"BuildCostConstructionTime"|"DiplomacyPointAmount"|"BuildCostDiscoveryProbability"|"TownAcquisitionCooldown"} ItemTooltipElement
 * @typedef {"Mine"|"ProcessingPlant"|"Farm"} ManufactoryType
 * @typedef {"Residents"|"Money"|"Buildings"} MarketplaceCategory
 * @typedef {"Population"|"Eco"|"Energy"} MarketplacePage
 * @typedef {"None"|"Aquanaut"|"Pirate"|"NeoSkullz"} MinimapFactionDot
 * @typedef {"VeryFew"|"Few"|"Many"|"VeryMany"} MultiselectionSize
 * @typedef {"None"|"AboveWater"|"UnderWater"|"Ship"|"Submarine"|"Airship"|"ScientistCity"|"SupporterCity"|"PirateCity"|"AquanautCity"|"RivalCity"|"OilBaronCity"|"EcoWarriorCity"} NamePools
 * @typedef {"Civ1"|"Civ2"|"Civ3"|"Civ4"|"WareTooltip_Sell"|"WareTooltip_Buy"|"WareTooltip_StockEmpty"|"WareTooltip_Locked"|"ItemTooltip_Sell"|"ItemTooltip_Locked"|"WareTooltip_ShipFull"|"ItemTooltip_ShipFull"} NeutralBaseTexts
 * @typedef {"NoStreetConnection"|"ConnectedToPlayer"|"WareTooltip_NotConnected"|"WareTooltip_StockEmpty"|"WareTooltip_CaravanFull"|"AcceptButton_NotConnected"|"AcceptButton_CooldownActive"|"AcceptButton_NoRessources"|"AcceptButton_NoWares"} NeutralBuildingTexts
 * @typedef {"DiscoverNewIsland"|"DiscoverUnderwater"|"DiscoverIsland"|"FoundArkPlayer"|"SaveGame"|"SaveGameAuto"|"LoadGame"|"NewBuildOption"|"Screenshot"|"EnergyShortage"|"ProductionWarning"|"FertilityCorrupted"|"FertilityIncreased"|"EcobalanceIncreased"|"EcobalanceDecreased"|"FormularDiscovered"|"ShipLeftWorld"|"ShipReturnedFromExpedition"|"ShipLostOnExpedition"|"ShipBeingBoarded"|"ShipBoarded"|"ShipBoardFailed"|"ShipBoardTargetDestroyed"|"ShipBoardAttackerDestroyed"|"LetterOfMarqueEnd"|"WhiteFlagEnd"|"FertilityChanged"|"FertilityEnd"|"FertilityChangedByPlayer"|"FertilityEndByPlayer"|"TakeOverStart"|"TakeOverAttackerDestroyed"|"TakeOverTargetDestroyed"|"TakeOverEnemySuccess"|"TakeOverSuccess"|"War"|"War2"|"Peace"|"ShipDied"|"ShipDiedOnTradeRoute"|"ShipDiedByTornado"|"ShipDiedByTornadoOnTradeRoute"|"WarehouseDestroyed"|"BuildingAttacked"|"ShipAttacked"|"ShipAttackedByPirates"|"StartFire"|"EnemyNearby"|"Cheat"|"PlayerLeft"|"Async"|"NewSettlement"|"MineNearlyEmpty"|"MineEmpty"|"TraderouteInefficient"|"TraderouteInvalid"|"TraderouteModifiedWare"|"TraderouteModifiedPrice"|"NewYear"|"ValentinesDay"|"Easter"|"Halloween"|"Christmas"|"Sylvester"|"ImportStarted"|"ImportArrived"|"Demonstration"|"ResidentsDowngrading"|"BlackTide"|"BlackTideForeign"|"BlackTideEnd"|"MonumentStarted"|"MonumentFinished"|"PatronActionEnded"|"NuclearLaunch"|"VictoryConditionReached"|"VictoryConditionReachedByPlayer"|"BlackSmoker"|"SupportFleetStarted"|"LaboratoryBonusItemCreated"|"HijackStealSuccess"|"HijackStealFailure"|"DiplomacyActionStarted"|"ForeignPlayer"|"OtherPlayerKilled"|"BuyMyShare"|"BuyNeutralShare"|"BuyMajorityShare"|"BuyShare"|"TownAcquisition"|"InvalidWorldEvent"|"SavegameConquest"|"ConquestStarted"|"QuestEscortTargetAttacked"|"BuyNeutralShareMyIsland"|"BuyMajorityShareSelf"|"TownAcquisitionSelf"|"MissileDefenseUsed"|"MissileReturns"|"RemovedEcoEffectFromRuin"|"StoppedProtest"|"MissileReturnsToShip"} NewsMessage
 * @typedef {"Exploration"|"Diplomacy"|"Disasters"|"Quests"|"Economy"|"System"|"ScienceMedia"|"Items"|"Population"|"Military"|"Shares"} NewsMessageCategory
 * @typedef {"Normal"|"Silver"|"Gold"} NewsMessageRank
 * @typedef {"None"|"LowEnergy"|"DiplomacyAction"} NewsMessageStickyType
 * @typedef {"Ship"|"WarShip"|"AirShip"|"Warehouse"|"ThirdpartyWarehouse"} ObjectListGroupType
 * @typedef {"Warehouse"|"Academy"|"ItemSelector"|"Multiselection"|"ActiveTradeWares"|"ActiveTradeItems"|"ArkStorageIngame"|"ArkStorageMenu"|"ConquestEvents"} PageLayoutType
 * @typedef {"None"|"Forest"|"Coast"|"Meadow"|"Wind"|"Energy"|"Farmfield"|"Coal"|"CleanAir"|"Sea"|"Shield"|"Manganese"|"Ruins"} ProductionResourceType
 * @typedef {"ResourceAvailable"|"ResouceMissing"|"ProducedWare"|"FullStock"|"FullWarehouse"} ProductionWareTooltipType
 * @typedef {"R"|"G"|"B"|"A"} RGBColor
 * @typedef {"None"|"Module"|"Technology"} ScienceItemType
 * @typedef {"Production"|"Eco"|"Energy"} StatisticbuildingPage
 * @typedef {"Outline"|"Balance"|"Production"|"Population"|"Buildings"|"Vehicles"|"Diagram"} StatisticMenuPage
 * @typedef {"Residents"|"Public"|"Warehouses"|"Food"|"Drink"|"Clothes"|"Property"|"Building materials"|"Military"} StatisticsBuildingCategory
 * @typedef {"RouteLines"|"ShipLines"|"EnergyLines"} StrategymapLines
 * @typedef {"Traderoute"|"TraderouteConnection"|"MilitaryRelocate"|"Patrol"|"Escort"|"QueuedWay"|"QueuedAttack"} TerrainLineTypes
 * @typedef {"None"|"ShowIfCurrentPlayer"|"ShowAlways"} ThirdpartySelectionInfoType
 * @typedef {"Auto"|"Seconds"|"MinutesSeconds"|"HoursMinutesSeconds"|"DaysHours"|"Days"} TimeFormat
 * @typedef {"Mail"|"InfoMail"|"BuddyList"|"Achievement"|"DatalogEntry"|"QuestAccomplished"|"QuestMail"|"ConnectionLost"|"Reconnected"|"ConquestSessionMessage"|"Info"} ToastMessageTypes
 * @typedef {"Low"|"Medium"|"High"} TraderouteEfficiency
 * @typedef {"Type1"|"Type2"|"Type3"|"Type4"|"Type5"} WarehouseMenuCategory
 * @typedef {"WareType"} WarehouseMenuSorting
 * @typedef {"PassiveTradeMenu_Small"|"PassiveTradeMenu_Big"} WarehousePassiveTradeSizes
 * @typedef {"WEB20_PORTAL"|"ACCOUNT_CREATION"|"UBI_SURVEY"|"EULA"} WebLinks
 * @typedef {"MilitaryBuilding"|"CivilBuilding"|"Ship"|"Submarine"|"Airship"} CombatType
 * @typedef {"Attack"|"AbortAttack"} MilitaryActionType
 * @typedef {"Idle"|"Attacking"|"Attacked"} MilitaryStateType
 * @typedef {"Straight"|"Arc"|"Homing"|"Nukular"|"Torpedo"|"Bomb"|"Artillery"} ProjectileType
 * @typedef {"Stone"|"Wood"|"Water"} ShotImpactType
 * @typedef {"Surround"|"Attack"|"SearchAndDestroy"|"ShareUnits"|"Defend"|"AttackMove"} AIAction
 * @typedef {"PlayerIsland"|"PlayerHarbour"|"PatrolStation"|"EasyKills"|"DefenseNeeded"|"BuildingProtectionNeeded"|"Defended"} AIAreaFlag
 * @typedef {"UnitsLost"|"UnitsDestroyed"|"BuildingsLost"|"BuildingsDestroyed"} AIAreaValue
 * @typedef {"KillTarget"|"SearchAndDestroy"|"KillTargetWithSurround"|"Defend"} AIGoal
 * @typedef {"Airship"|"Ship"|"Submarine"|"Kontor"|"Shipyard"|"Harbour"|"Tower"|"Airport"|"PrimaryTarget"|"Production"|"PublicBuilding"|"ResidenceBuilding"|"Warship"|"Tradingship"|"Warehouse"} AIMilitaryTarget
 * @typedef {"None"|"ShareUnits"|"Attack"|"Patrol"|"Escort"|"GuardArea"|"Guard"|"KillQuestObjects"|"Surround"|"SearchAndDestroy"|"AttackPlayer"|"AttackMove"|"Defend"} AISquadCommand
 * @typedef {"None"|"GotoPosition"|"Attack"|"DiveDown"|"DiveUp"|"Repair"|"LeaveWorld"|"ShipToEscort"|"TradingRace"|"Escort"|"UseItem"|"GetItem"|"Flee"|"JoinSquad"|"MerchantFleet"|"TransportRoute"|"Discover"|"GuidedEscort"} AIUnitCommand
 * @typedef {"WarShips"|"Trade"|"PassiveTrade"|"MilitaryBudget"} BankBook
 * @typedef {"Military"|"Buildup"|"Trade"|"TownAcquisition"} BudgetEntry
 * @typedef {"ProductSold"|"IslandEcoBalance"|"GlobalEcoBalance"|"ResidentBuilding"} BudgetEvent
 * @typedef {"War"|"Peace"} BudgetType
 * @typedef {"NONE"|"CONNECTALL"|"CONNECTSTARTRECORDSET"} ConnectionRecordsetType
 * @typedef {"TradingShip"|"WarShip"|"TransportShip"|"Kontor"|"ShipRepair"|"Tower"|"Building"|"ShipAttackingTradingShip"|"ShipAttackingWarShip"|"ShipAttackingBuilding"|"BuildingOnPlayerIsland"|"BuildingOnMainIsland"|"EscortShip"} FleetTarget
 * @typedef {"BAY"|"STRAIGHTLINE"|"SEAWARD"} HarbourPosition
 * @typedef {"Inferior"|"Equal"|"Superior"} MilitaryStrength
 * @typedef {"CITYAREA"|"FARMAREA"|"HARBOURAREA"} RecordsetPlacement
 * @typedef {"Maincity"|"Extension"|"Connection"|"Farm"|"PumpingStation"|"HarbourConnection"|"Airport"|"CityResearch_3x3"|"CityResearch_2x2"|"CityResearch_1x1"|"CityResearch_1x2"|"CityResearch_2x1"|"CityResearch_1x3"|"CityResearch_3x1"|"CityResearch_1x4"|"CityResearch_4x1"|"CityResearch_7x7"|"CityResearch_3x7"|"CityResearch_7x3"|"CityResearch_5x3"|"CityResearch_3x5"|"CityResearch_5x5"|"CityResearch_3x4"|"Publicarea"|"VillageCenter"|"Underwater"|"SCI_Lab"|"SCI_Academy"} RecordsetType
 * @typedef {"None"|"AttackShip"|"AttackKontor"|"Patrol"|"ColonizeIsland"|"TradeRoute"|"DiscoverOrient"|"DiscoverWorld"|"Flee"|"GoHome"|"Escort"|"Repair"|"Quest"|"LeaveWorld"|"GuardPosition"|"KillQuestObjects"|"Die"|"Campaign"|"SellShip"|"ActionsBlocked"|"UseItem"|"ActiveTrade"|"UseAttackItem"|"UseTradeItem"|"ProductTrade"|"Runaway"|"KillWarship"|"CallForHelp"|"TradingRaceOpponent"} ShipTask
 * @typedef {"DisableFlee"|"DisableRepair"|"Defend"} SquadSetting
 * @typedef {"LowHitpoints"|"IsStanding"|"IsStronger"|"IsWeaker"|"IsTradingShip"|"IsWarShip"|"IsNearer"|"HasHigherProtection"|"HasLowerProtection"} TargetCondition
 * @typedef {"ECO_MAINBUILDING"|"ECO_EXTENSION"|"ECO_SHIPYARD"|"ECO_REPAIRDOCK"|"OB_MAINBUILDING"|"OB_LANDING"|"OB_PIER"|"OB_SHIPYARD"|"OB_STORAGE_FL"|"OB_STORAGE_FR"|"OB_STORAGE_L"|"OB_STORAGE_R"|"ECO_COASTSEGMENT"|"RIVAL_LARGE_DEFENCE"|"RIVAL_MAINBUILDING"|"RIVAL_SMALL_DEFENCE"|"DUMMY"|"OB_REPAIRDOCK"|"CITYRESEARCH_SEGMENT"|"CITYRESEARCH_CENTER"|"CITYRESEARCH_PROP_MED"|"CITYRESEARCH_PROP_BIG"|"CITYRESEARCH_PROP_SMALL"|"CITYRESEARCH_PROP_TINY"|"SUP_LANDSTORAGE"|"SUP_CONNECTOR_L"|"SUP_CONNECTOR_R"|"SUP_SHIPYARD"|"SUP_WAREHOUSE"|"SUP_DECO_L"|"SUP_REPAIRDOCK"|"SUP_DECO_S"|"ECO_CONNECTOR_M"|"CITYRESEARCH_REPLACEMENT"|"CITYRESEARCH_PUBLIC"|"SCI_MAINBUILDING"|"SCI_FILLSEGMENT_3X3"|"SCI_FILLSEGMENT_5X5"|"RIV_FILLSEGMENT_5x5"} TPHarbourType
 * @typedef {"None"|"Quest"|"LeaveWorld"|"Repair"|"KillTarget"|"Patrol"|"Scenario"|"ShipToEscort"|"GoHome"|"Flee"|"ColonizeIsland"|"Explode"|"UseItem"|"SellShip"|"ActionsBlocked"|"DiveUp"|"DiveDown"|"Defend"|"Transport"|"Escort"|"MerchantFleet"|"ShipToBoard"|"TransportRoute"|"Discover"|"ColonizeUnderWaterIsland"|"Support"|"CleanDisaster"|"Trader"|"QuestStation"} UnitGoal
 * @typedef {"None"|"HugeMissile"|"Bomb"|"Waterbomb"|"EMP"} AOEVisualType
 * @typedef {"Copper"|"Gold"|"Uranium"|"Iron"|"Random"|"Manganese"|"Diamonds"} BlackSmokerResult
 * @typedef {"ShipDamaged"|"ShipReturned"} ExpeditionResult
 * @typedef {"Weak"|"Normal"|"Strong"} FormulaVariation
 * @typedef {"Usable"|"Unusable"|"InvalidAllocationCategory"|"FertilityAlreadyExists"|"InvalidIslandClime"|"NoFertilityWildcard"|"NoValidPlayerAvailable"|"HijackerIsActive"|"ShipExplosionIsActive"|"LetterOfMarqueIsActive"|"RequiresCombatAbility"|"UnableToSubmerge"|"WhiteFlagIsActive"|"RequiresSpecificArea"|"InvalidWorldlayer"|"MissingIntermediateLevel"|"AlreadyActive"|"AirshipIsLanded"|"RefillResourceUnavailable"|"BlackSmokerNotActive"|"NoProtestActive"|"NoNeutralNegativeEcoBuildingOnIsland"|"MissingDLC"} IsItemUsableResult
 * @typedef {"Other"|"Eco"|"Tycoon"|"Tech"|"Senate"} ItemFaction
 * @typedef {"A"|"B"|"C"|"D"|"QuestItem"|"Document"|"WorldPatronItem"|"TestItem"} ItemQuality
 * @typedef {"SinglePlayer"|"DiscoveredWorld"|"NoDisasterFire"|"NoDisasterPlague"} ItemRemoveCondition
 * @typedef {"All"|"A"|"B"|"C"|"WorldPatron"} ItemSocketQuality
 * @typedef {"None"|"Object"|"Island"|"Global"|"ObjectInfluenceArea"} ItemTarget
 * @typedef {"None"|"Expedition"|"Pet"|"ForceTreaty"|"Seeds"|"Hijacker"|"ConstructionPlan"|"PowderKeg"|"Toll"|"WhiteFlag"|"LetterOfMarque"|"Stealth"|"QuestObject"|"Document"|"SeaChart"|"EndlessResource"|"SearchLight"|"Upgrade"|"ToggleHeight"|"TakeOver"|"AreaOfEffect"|"MissileDefense"|"GuidingEscort"|"SeaMine"} ItemType
 * @typedef {"Always"|"Unique"|"Never"} MetaGameTransferablePermission
 * @typedef {"Hitpoints"} ObjectAttribute
 * @typedef {"None"|"Formula"|"FactionPromotion"|"BonusMission"|"VehicleSkin"|"OrnamentalBuilding"|"Package"|"Vehicle"|"Building"} RewardCategory
 * @typedef {"All"|"Player0"|"Player1"|"Player2"|"Player3"|"Player4"|"Player5"|"Player6"|"Player7"} TargetPlayer
 * @typedef {"None"|"Silver"|"Gold"} AchievementLevel
 * @typedef {"Level1"|"Level2"|"Level3"|"Level4"|"Level5"|"Expert"|"Hidden"} AchievementLevelType
 * @typedef {"Normal"|"Expert"|"Hidden"} AchievementType
 * @typedef {"Quest"|"Diplomacy"|"Economy"|"Hidden"|"Pro"|"Preset"} TitleCategory
 * @typedef {"PROGRESS"|"SETPLAYERCOLOR"|"VARIABLE"|"GUIDCOUNTER"|"TASKSTATUS"|"COUNTDOWN"|"KEYID"|"PLAYERNAME"|"GUIDNAME"|"SEL_HANDLE_HITPOINTS_CUR"|"SEL_HANDLE_HITPOINTS_MAX"|"SPEAKTEXT"|"MSGQUEUE_CITYNAME"|"MSGQUEUE_GUIDNAME"|"HIGHEST_CIV_INHABITANTS"|"WEALTH"|"RESOURCES_FERTILE"|"RESOURCENAME"|"RESOURCETYPE"|"SEL_HANDLE_HITPOINTS"|"SEL_HANDLE_ATTACKSTRENGTH"|"SEL_HANDLE_ENERGYCONSUME"|"SEL_HANDLE_ENERGYPRODUCE"|"SEL_HANDLE_ECOPRODUCE"|"SEL_HANDLE_WAREHOUSE_CAPACITY"|"SEL_RESIDENCE_ECOBALANCE_MORALE"|"SHIP_LOAD_CAPACITY"|"FLOWCONTROL_VARIABLE_VALUE_NUMBER"|"FLOWCONTROL_VARIABLE_VALUE_TEXTID"|"THIRDPARTY_ACTIVE_PLAYER"|"THIRDPARTY_PASSIVE_PLAYER"|"THIRDPARTY_RESIDENT_LEVEL"|"THIRDPARTY_TRIBUTE"|"THIRDPARTY_SENDER_PLAYER"|"THIRDPARTY_THIRD_PLAYER"|"THIRDPARTY_CITY"|"MSGQUEUE_WARESAMOUNT"|"MSGQUEUE_MONEYAMOUNT"|"MSGQUEUE_TREATYPARTNER"|"SEL_HANDLE_CARTCOUNT"|"SEL_HANDLE_IDLECARTCOUNT"|"HANDLE_NAME"|"PLAYERDESCRIPTION"|"THIRDPARTY_OBJECT"|"MULTIPLAYER_LEVELNAME"|"PROGRESSBARVALUE"|"THIRDPARTY_WARES"|"UPGRADE_INFO"|"VICTORYCONDITION_CAPITAL"|"VICTORYCONDITION_CITIZENS"|"VICTORYCONDITION_QUESTS"|"SEL_HANDLE_PLAYER"|"VICTORYPLAYERNAME"|"VICTORYREASON"|"MSGQUEUE_IMPROVEDMINE"|"LAPTOPBATTERY"|"LAPTOPWLAN"|"CAMPAIGNINFO"|"CURRENT_DIFFICULTY_TEXT"|"ABLTIMER"|"ABLVARIABLE"|"HIGHLIGHTED_GAMEVERSION_NAME"|"FILECHECKINFO"|"PROFILE_PLAYERNAME"|"BUILDING_MAINTENANCE"|"MONEY_INCOME"|"RESOURCE_INCOME"|"RESOURCE_INCOME_BONUS"|"SHIP_MAINTENANCE"|"CURRENT_BALANCE"|"CURRENT_WOOD_AMOUNT"|"CURRENT_TOOL_AMOUNT"|"RESERVED_MONEY"|"RESERVED_WOOD_AMOUNT"|"RESERVED_TOOLS_AMOUNT"|"CURRENT_CITY_NAME"|"SEL_BUILDING_LEVEL_INCOME"|"SEL_BUILDING_EFFICIENCY"|"SEL_BUILDING_RAW_MATERIAL1_AMOUNT"|"SEL_BUILDING_RAW_MATERIAL2_AMOUNT"|"SEL_BUILDING_PRODUCED_AMOUNT"|"SEL_WAREHOUSE_ISLAND_INCOME"|"SEL_WAREHOUSE_ISLAND_COSTS"|"SEL_WAREHOUSE_ISLAND_BALANCE"|"SEL_WAREHOUSE_CITY_NAME"|"MANPOWER_ISLAND_INCOME"|"MANPOWER_ICON"|"SEL_SHIP_WAREHOUSE_CITY_NAME"|"SHIP_LISTBOX_TOOLTIP"|"SEL_BUILDING_ISLAND_COUNT"|"SEL_BUILDING_RESIDENTS_COUNT"|"QUEST_NAME"|"QUEST_INFOTEXT"|"QUEST_TOOLTIP"|"QUEST_TIMELEFT"|"QUEST_GETWARES"|"QUEST_STORYTEXT"|"QUEST_REWARD"|"QUEST_MAPWARES"|"QUEST_SENDER"|"QUEST_CITY"|"QUEST_AMOUNT"|"QUEST_EXECUTOR"|"SELECTED_HANDLE_PLAYER_DIPLOMACY_STATUS"|"THIRDPARTY_QUEST_WARES"|"INHABITANT_PRECONDITION"|"UNLOCK_REQUIREMENTS"|"DEMAND_REQUIREMENT"|"SEL_HANDLE_CIVLEVEL"|"RESIDENTS_MISSINGDEMANDS"|"INFOLAYER_PRODUCED_AMOUNT"|"TRANSFER_AMOUNT"|"THIRDPARTY_QUEST_NAME"|"ORDERED_GOODS"|"ITEM_EFFECT"|"ITEM_RANGE"|"ITEM_DURATION"|"ITEM_COOLDOWN"|"THIRDPARTY_QUEST_REWARD"|"SATISFIED_NEED"|"SATISFACTION_CURRENT"|"SATISFACTION_MAX"|"SUPPORTEDSHIPLIMIT"|"CURRENTSHIPCOUNT"|"TASKCOUNT"|"THIRDPARTY_REWARD"|"THIRDPARTY_REWARD_TOOLTIP"|"DEMAND_CATEGORY"|"TALENT_UNLOCK_PRECONDITIONS"|"TALENT_PRECONDITIONS"|"TALENT_EXECUTION_COSTS"|"DEMAND_AMOUNT"|"DEMAND_PRICE"|"ACTIVE_TRADE_COSTS"|"PICKUP_COOLDOWN_TIME"|"ITEM_POWDERKEG_EXPLOSIONCOUNTDOWN"|"FERTILITYNAME"|"ITEM_EXPEDITIONMAP_REMAININGDURATION"|"ITEM_WHITEFLAG_DURATION"|"ITEM_LETTEROFMARQUE_DURATION"|"ITEM_SOCKETED_INFO"|"ITEM_TOLL_PRODUCTLIST"|"MSGQUEUE_TREATYSTATUS"|"CURRENT_INFOBAR_WARE_AMOUNT"|"CURRENT_INFOBAR_WARE_RESERVED"|"THIRDPARTY_QUEST_INFOTEXT"|"THIRDPARTY_QUEST_AMOUNT"|"QUEST_NUMBER"|"QUEST_MONEYTOPAY"|"THIRDPARTY_QUEST_NUMBER"|"ITEM_TOOLTIP"|"ITEM_TOOLTIP_DISABLED"|"ITEM_TOOLTIP_PRESSED"|"ITEM_CONSTRUCTION_TOOLTIP"|"PRODUCT_OR_ITEM_TOOLTIP"|"ITEM_SPECIAL_DESCRIPTION"|"ITEM_TYPE"|"ITEM_QUALITY_COLOR"|"ITEM_TYPE_DESCRIPTION"|"ITEM_BUILDCOST"|"THIRDPARTY_PREFERRED_GOODS"|"SEL_CENTER_RESIDENTBUILDINGSCOUNT"|"SEL_CENTER_UPGRADE_CHARGES"|"PLAYER_STATS"|"GAME_ID_COUNT"|"THIRDPARTY_REPUTATION"|"DOWNLOADED_PROFILES_COUNT"|"PRODUCT_OR_ITEM_NAME"|"SEL_WAREHOUSE_BUILDING_COUNT"|"SEL_WAREHOUSE_CITIZEN_COUNT"|"RESIDENT_CAPACITY"|"SEL_HOUSE_CITIZEN_COUNT"|"SEL_HOUSE_RESIDENT_CAPACITY"|"CATEGORY_SATISFACTION_CURRENT"|"CATEGORY_MINQUOTE_CURRENT"|"CATEGORY_UPGRADEQUOTE_CURRENT"|"WARE_DETAIL_INFO"|"REMAINING_ACHIEVEMENT_POINTS"|"ARMY_MAINTENANCE"|"RESIDENTAMOUNT"|"QUEST_VICTORYCONDITION_PLAYERCOUNTER"|"QUEST_VICTORYCONDITION_PLAYERCOUNTER_MIN"|"QUEST_VICTORYCONDITION_PLAYERCOUNTER_MAX"|"QUEST_VICTORYCONDITION_OBJECTSTOWIN"|"QUEST_WINCONDITION_OBJECTS"|"QUEST_REMAINING_ITEMS"|"QUEST_ITEMCOUNT"|"VOLUME"|"QUEST_VALUE"|"GUIDNAME2"|"CONTEXT_INTEGER"|"PLAYERNAME2"|"TRADEROUTE_NAME"|"CONTEXT_STRING"|"OBJECTEFFECT_TOOLTIP"|"OBJECTEFFECT_DURATION"|"OBJECTEFFECT_TITLE"|"SEL_HANDLE_GUIDNAME"|"MSGQUEUE_PLAYERNAME"|"SEL_SHIP_ESCORT_TARGET"|"SEL_SHIP_ROUTENAME"|"PLAYER_PROFILE_TYPE"|"EARNED_MEDAL_COUNT"|"EARNED_MEDAL_GROUP_COUNT"|"EARNED_TITEL_COUNT"|"EARNED_TITLE_GROUP_COUNT"|"EARNED_ACHIEVEMENT_COUNT"|"CUR_ISLAND_WARE_AMOUNT"|"ACHIEVEMENT_DESCRIPTION"|"THIRDPARTY_TRADEQUEST_CURRENTGOLD"|"THIRDPARTY_TRADEQUEST_MAXGOLD"|"PLAYERCOUNTER"|"THIRDPARTY_UPGRADEREQUIREMENTS"|"THIRDPARTY_SELECTED_PLAYER"|"THIRDPARTY_GUID"|"SEL_HANDLE_SUB_DEMAND_FULFILLMENT_TEXT"|"ITEM_STORAGE_CONTEXTINFO"|"SEL_CENTER_MAX_UPGRADE_CHARGES"|"RIGHTS_RATIO_FOR_RESIDENTLEVEL"|"RESIDENCE_UPGRADE_AMOUNT_MAX_PERCENT"|"ACHIEVEMENT_REQUIREMENTS"|"MSGQUEUE_TRADEROUTE_NAME"|"ACTIVETRADE_WARES_WARNING"|"BINDING"|"QUEST_EXECUTIONCITY"|"QUEST_PLAYERCOUNTER"|"QUEST_MINSURVIVORS"|"TREATYPARTNER_REPUTATION"|"SHIPINFO"|"TREATYPARTNER_NEXT_TREATY"|"QUEST_SENDER_AUTOSIZE_ICON"|"QUEST_TYPE_READABLE"|"QUEST_DIFFICULTY"|"QUEST_ESCORTWAITINGTIME"|"QUEST_GETRESIDENTSPERLEVEL"|"QUEST_ENEMY"|"SEL_SHIP_LIST"|"KONTORINFO"|"PLAYERTITLE"|"CITY_NAME"|"DIFFICULTY_MIN_VALUE"|"DIFFICULTY_MAX_VALUE"|"CURRENT_TIME"|"OVERALL_PLAY_TIME"|"DIFFICULTY_POINTS_BY_NAME"|"MSGQUEUE_SHIPNAME"|"QUEST_VICTORYCONDITION_OBJECTSTOWIN_CURVALUE"|"QUEST_VICTORYCONDITION_PLAYERCOUNTER_CURVALUE"|"QUEST_ISLANDCOUNT"|"SCREENSHOT_PATH"|"MILITARY_OBJECT_STRENGTH"|"OBJECT_HITPOINTS"|"ONLINE_ACCOUNT_USERNAME"|"ITEM_ACTIVATION_INFO"|"TRADEROUTE_WAYPOINT_WARE_AMOUNT"|"TRADEROUTE_WAYPOINT_WARE_PRICE"|"SHIP_CLAIM"|"GAMEVERSION"|"PLAYER_PROFILE_NAME"|"THIRDPARTY_VISIBLE_PLAYER"|"THIRDPARTY_QUEST_REPUTATION"|"GUID_OR_SPYBASE_NAME"|"GUID_OR_SPYBASE_ICON"|"QUEST_CALLCOUNT"|"ENERGYPRODUCTIVITY"|"ENERGYLEVEL"|"ENERGYCONSUME"|"ENERGYPRODUCTION"|"ECOBALANCE"|"ISLAND_ECOBALANCE"|"GETRESOURCE"|"QUEST_RACESTARTTIME"|"QUEST_RACE_STATION"|"QUEST_ISLANDCOUNTER_CURRENTVALUE"|"QUEST_ISLANDCOUNTER"|"QUEST_EXECUTION_PLACE"|"QUEST_RACE_ITEM"|"THIRDPARTY_MESSAGE"|"CURRENT_GAME_PLAY_TIME"|"BUILDING_COSTS"|"BUILDING_COSTS_FROM_SHIP"|"UPGRADE_COSTS"|"SEL_FARM_FARMFIELD_COSTS"|"SEL_FARM_FARMFIELDNAME"|"SEL_FARM_CULTIVATION_COSTS"|"SEL_FARM_ENERGY_SHORTAGE"|"SEL_FARM_FERTILITY_CORRUPTION"|"SEL_FARM_MAXFARMFIELDS"|"FARM_FARMFIELD_COUNTANDNAME"|"SEL_ECOBALANCE_OVERLAP"|"MONUMENT_WARES_PROGRESS"|"DIPLOMACYACTION_DESCRIPTION"|"DIPLOMACYACTION_PERCENTAGE"|"DIPLOMACYACTION_COST"|"DIPLOMACYACTION_SUPPORTFLEET"|"SEL_HANDLE_MAINTENANCE"|"DIPLOMACYACTION_TRIBUTE"|"DIPLOMACYACTION_ACTIVATIONS"|"DIPLOMACYACTION_DURATION"|"DIPLOMACYACTION_EFFECT"|"DIPLOMACYACTION_RANGE"|"DIPLOMACYACTION_COOLDOWN"|"DIPLOMACYACTION_COOLDOWNTEXT"|"DIPLOMACYACTION_TRADEPRICE"|"DIPLOMACYACTION_VARIATION"|"DIPLOMACYACTION_CHOICE"|"DIPLOMACYACTION_COMPLETE_COOLDOWN"|"DIPLOMACYACTION_EMPLOYMENT_RESOURCES"|"TIME_UNTIL_NEXT_DAILY_QUEST"|"TIME_WHEN_SENATE_VOTE_STARTS"|"TIME_WHEN_SENATE_VOTE_ENDS"|"TIME_WHEN_SENATE_ITEM_EXPIRES"|"SENATE_VOTE_WINNER"|"CURRENT_REPUTATION"|"CURRENT_NEEDED_REPUTATION"|"CURRENT_MISSION_ID"|"CURRENT_REPUTATION_GAIN"|"ACADEMY_SELECTED_DEV"|"ACADEMY_DEV_BUILDTIME"|"TASK_PRODUCTION_BOOST_TIMEREDUCTION_PERCENT"|"SEL_HANDLE_STORAGE"|"TASK_PRODUCTION_BOOST_MAXRESIDENTS"|"AFFECTED_RESIDENTCOUNT"|"CHANNEL_TOOLTIP"|"CHANNEL_DESCRIPTION"|"CHANNEL_COST"|"CHANNEL_CONDITION"|"DISASTER_PROBABILITY"|"FORMATTED_TEXT"|"DIPLOMACY_ACTIONPOINT_COUNT"|"QUEST_WINCONDITION_REMAINING_DURATION"|"QUEST_WINCONDITION_DURATION"|"FADING_ECO_BALANCE"|"CONVERT_SECONDS_TO_DAYS"|"ISLAND_NAME"|"ISLAND_FERTILITIES"|"DIPLOMACYACTION_MONEYLENDER_BALANCE"|"DIPLOMACYACTION_MONEYLENDER_PAYBACK"|"AIRFIELD_CURRENT_FUEL_AMOUNT"|"AIRFIELD_MAX_FUEL_AMOUNT"|"AIRFIELD_DYNAMIC_FUEL_AMOUNT"|"DIPLOMACYACTION_NAME"|"DIPLOMACYACTION_SPECIALSUPPLY_AMOUNT_OFFSET"|"DIPLOMACYACTION_SPECIALSUPPLY_PRODUCTIONTIME_OFFSET"|"DIPLOMACY_GENERATIONRATE"|"DIPLOMACY_GENERATIONLEVEL"|"ITEM_QUALITY_TEXT"|"ITEM_QUALITY_ICON"|"ITEM_CATEGORY"|"QUEST_MAPPEDISLANDS"|"QUEST_CATEGORY"|"THIRDPARTYFUNCTION_COST"|"DIPLOMACYACTION_FORCE_COST"|"DIPLOMACYACTION_RESOURCE_REWARD"|"DIPLOMACYACTION_RESOURCE_COST"|"TASK_PRODUCTION_HISTORY"|"FORMAT_DATETIME"|"VOTING_RESULT"|"VOTING_WINNER"|"ASSET_CATEGORY_NAME"|"ITEM_ITEMCOST"|"ITEM_PRODUCTIONTIME"|"ITEM_BUILD_REQUIREMENTS"|"ITEM_DIPLOMACYBOOST"|"ISLAND_INFO_FERTILITIES"|"ISLAND_INFO_ECOBALANCE"|"ISLAND_INFO_ENERGYLEVEL"|"BLACKMARKETTRADER_DURATION"|"MAINISLAND"|"VEHICLETYPE"|"SENATE_EFFECT"|"ACHIEVEMENT_ICON"|"ACHIEVEMENT_DATE"|"ACHIEVEMENT_REWARDS"|"ACHIEVEMENT_NAME"|"ACHIEVEMENT_CONDITION"|"ACHIEVEMENT_WINCONDITIONS"|"ACHIEVEMENT_OBJECTNAME"|"VEHICLE_FUEL_AMOUNT"|"AIRFIELD_SIZE"|"VEHICLE_SLOT_COUNT"|"VEHICLE_DESCRIPTION"|"ITEM_SOCKET_RARITY"|"PRODUCTIONTIME"|"NEEDED_REPUTATION"|"SEL_HANDLE_SLOT_CAPACITY"|"ENERGY_DIFFERENCE"|"PLAYERPROFILEICON"|"DIPLOMACYACTION_CHARGES"|"ACTIVETRADE_MANPOWER_COST"|"QUEST_BASEQUEST_PLAYER"|"QUEST_RELATION_PLAYER"|"QUEST_RELATION_PLAYER_SHORTNAME"|"BALANCE_DETAIL"|"WORLDWIDE_RESIDENT_COUNT_PER_LEVEL"|"SENATE_EFFECT_DESCRIPTION"|"TRADEHISTORY"|"THIRDPARTY_IMPORT_GOODSTYPE"|"THIRDPARTY_IMPORT_GOODSAMOUNT"|"THIRDPARTY_IMPORT_PRICE"|"IMPORT_COOLDOWN_TIME"|"BLACKSMOKER_TIME"|"ISLAND_RESOURCE_AMOUNT"|"ISLAND_RESOURCE_USED_SLOTS"|"ISLAND_FREE_MINE_SLOTS"|"SHIELD_GENERATOR_VALUE"|"DEBUG_INFOS"|"ITEM_ACTIVATION_REQUIREMENTS"|"REPAIRSERVICE_DURATION"|"SEL_PROPAGANDA_CHANNEL"|"BUILDING_MAINTENANCE_HEADER"|"BUILDING_MAINTENANCE_HEADER_FROM_SHIP"|"QUEST_RACE_STATIONS_NEEDED"|"QUEST_RACE_STATIONS_COMPLETED"|"QUEST_RACE_OBJECTS_NEEDED"|"QUEST_RACE_OBJECTS_REMAINING"|"GAME_SETTING_START_CREDITS"|"GAME_SETTING_MANPOWER"|"GAME_SETTING_INITIAL_PEACE"|"CURRENTOVERLAP"|"CURRENTAFFECTED"|"CURRENTPRODUCTIVITY"|"QUEST_DIPLOMACYPOINTS"|"DAILYQUEST_FACTIONNAME"|"WINCONDITION_AMOUNT"|"DIPLOMACYACTION_PRECONDITIONS"|"QUEST_PRODUCTCOUNTER_PRODUCT"|"QUEST_PRODUCTCOUNTER_NEEDED_VALUE"|"QUEST_PRODUCTCOUNTER_CURRENT_VALUE"|"QUEST_FEATURECOUNTER_FEATURE"|"QUEST_FEATURECOUNTER_NEEDED_VALUE"|"QUEST_FEATURECOUNTER_CURRENT_VALUE"|"QUEST_FEATURECOUNTER"|"QUEST_QUESTCOUNTER_CURRENT_VALUE"|"QUEST_CURRENT_STEP"|"QUEST_THIRDPARTY_WINCONDITION"|"ARK_PRODUCT_AMOUNT"|"REMAINING_PEACE_TIME"|"WORLD_PATRON_WINNER"|"ITEM_CAP_INFO"|"ITEM_ACTIVATION_COST"|"WARE_TRADE_LIMIT"|"QUEST_REWARD_WARES"|"QUEST_VEHICLETYPE"|"LOW_ENERGY_ISLAND_LIST"|"QUEST_DEMOLISH_OBJECTS"|"NEWS_CATEGORY"|"ITEM_ASSETCATEGORY_ICON"|"BUILDING_NEEDED_FERTILITY"|"ITEM_SCIENCE_TOOLTIP"|"WORLD_PATRON_NAME_CURRENT"|"VOTING_RESULT_ICON"|"VOTING_RESULT_FACTION"|"VOTING_RESULT_PERCENTAGE"|"VOTING_RESULT_WINNER_CLASS"|"WORLD_PATRON_EFFECT_DESCRIPTION"|"WORLD_PATRON_EFFECT_ICON"|"WAREHOUSE_STORAGE"|"SENATE_TOPIC_NAME"|"SEL_HANDLE_ENERGY_DIFFERENCE"|"ACTIVE_DIPLOMACY_ACTIONS"|"DIPLOMACYACTION_REWARD_DIPLOMACYPOINTS"|"ITEM_OBJECTEFFECT_DESCRIPTION"|"SENATE_EFFECT_DESCRIPTION2"|"WORLD_PATRON_CHARACTER_TEXT"|"FACTION_REPUTATION_REWARD_DESCRIPTION"|"ITEM_BUILDCOST_DISASTERPROBABILITY"|"ITEM_BUILDCOST_DISCOVERYPROBABILITY"|"FACTION_REPUTATION_REWARD_PICTURE"|"RECONNECT_TIMER"|"LAST_CONNECTION_ERROR"|"WORLD_PATRON_EFFECT_NAME"|"WORLD_EVENT_COMMUNITY_REWARD"|"WORLD_EVENT_LEVEL_THRESHOLD"|"SHARE_VALUE"|"TOWN_VALUE"|"ISLAND_DIVIDEND"|"SHARES_COOLDOWN"|"CONQUEST_MISSION_VICTORY_CONDITION"|"CONQUEST_MISSION_ACTIVE_PLAYERS"|"CONQUEST_MISSION_LEVEL"|"CONQUEST_SESSION_NAME"|"CONQUEST_MISSION_SCORE"|"CONQUEST_MISSION_SCORE_PER_LEVEL"|"CONQUEST_MISSION_POINT_REWARD"|"CONQUEST_TEAM_NAME"|"CONQUEST_PLAYER_NAME"|"CONQUEST_PLAYER_SCORE"|"CONQUEST_PLAYER_PLAYTIME_SENTENCE"|"CONQUEST_PLAYER_PLAYTIME_LEFT"|"SHARES_PERCENTAGE"|"ACHIEVEMENT_COUNT"|"GUIDINGESCORT_STATIONS_NEEDED"|"GUIDINGESCORT_STATIONS_COMPLETED"|"ISLAND_RESOURCES"|"SOCKET_REQUIREMENTS"|"SHARE_OWNER"|"SHARE_DIVIDENT"|"CONQUEST_PLAYER_NEXTPLAYTIME"|"SHARE_VALUE_SUM"|"SCIENCE_ITEM_CATEGORY"|"SLOT_LEADER_NAME"|"ACADEMY2_ITEM_EFFECT"|"QUEST_VICTORYCONDITION_ASSETCOUNTER_CURVALUE"|"ENERGYTRANSMTTER_TRANSMITTING_ENERGY"|"AIRPORT_BUILDSPACE_CONDITION"} Tags
 * @typedef {"BUILDING_COSTS"|"BUILDING_COSTS_FROM_SHIP"|"UPGRADE_COSTS"|"SEL_FARM_FARMFIELD_COSTS"|"SEL_FARM_CULTIVATION_COSTS"|"MONUMENT_WARES_PROGRESS"} TextTemplates
 * @typedef {"Off"|"Easy"|"Medium"|"Hard"} CG_CorsairStrength
 * @typedef {"CSP1"|"CSP2"|"CSP3"} CG_CSP
 * @typedef {"Nothing"|"Half"|"Full"} CG_DemolitionReturn
 * @typedef {"Off"|"Easy"|"Medium"|"Hard"} CG_Disaster
 * @typedef {"Spare"|"Medium"|"Plenty"} CG_Fertilities
 * @typedef {"Any"|"AnyPlusTechs"|"Both"|"BothPlusTechs"} CG_InitialFactions
 * @typedef {"Off"|"Short"|"Medium"|"Long"|"VeryLong"|"ExtremeLong"|"UltraLong"|"Endless"} CG_InitialPeaceDuration
 * @typedef {"Off"|"Shortterm"|"Midterm"|"Longterm"|"Endless"} CG_InitialPeaceTreaty
 * @typedef {"War"|"Peace"|"Trade"|"Alliance"} CG_InitialTreaty
 * @typedef {"Easy"|"Medium"|"Hard"} CG_IslandDifficulty
 * @typedef {"neutral"|"positive"|"negative"|"mixed"} CG_IslandEcoBalance
 * @typedef {"Small"|"Medium"|"Large"} CG_IslandSize
 * @typedef {"AtStartIsland"|"UsePlayerArkSlot"|"NoArk"} CG_PlayerArk
 * @typedef {"Off"|"Standard"|"Often"|"Sometimes"} CG_QuestFrequency
 * @typedef {"Spare"|"Medium"|"Plenty"} CG_Resources
 * @typedef {"Spare"|"Medium"|"Plenty"|"VeryMuch"} CG_StartCredit
 * @typedef {"None"|"Few"|"Plenty"} CG_StartManpower
 * @typedef {"Off"|"Standard"|"Support"|"Armada"} CG_StartShips
 * @typedef {"Off"|"Standard"|"Double"|"Tripple"} CG_StartWithWarehouse
 * @typedef {"Small"|"Medium"|"Large"} CG_WorldSize
 * @typedef {"Easy"|"Medium"|"Hard"} Difficulty
 * @typedef {"Off"|"On"} VC_VictoryCondition
 * @typedef {"Off"|"Few"|"Medium"|"Plenty"} VC_VictoryConditionAmount
 * @typedef {"Off"|"Half"|"All"} VC_VictoryConditionIslandsSettled
 * @typedef {"All"|"Single"} VC_VictoryConditionMode
 * @typedef {"Off"|"MonumentAny"|"MonumentBoth"|"MonumentAnyAndTech"|"MonumentTech"|"MonumentAll"} VC_VictoryConditionMonument
 * @typedef {"Off"|"Short"|"Medium"|"Long"|"VeryLong"} VC_VictoryConditionPlayedTime
 * @typedef {"Horizontal"|"Vertical"|"Both"} GEC_AutoSize
 * @typedef {"Left"|"Right"} GEC_AutoSizeAlign_Horizontal
 * @typedef {"Top"|"Bottom"} GEC_AutoSizeAlign_Vertical
 * @typedef {"FixedSize"|"AutoSizeWidth"|"AutoSizeHeight"|"AutoSizeAll"} GEC_AutoSizeToContent
 * @typedef {"Technique_None"|"Technique_Blur"} GEC_Background_Technique
 * @typedef {"BoxLayout_Style"|"FlowLayout_Style"} GEC_Boxlayout_Behaviour
 * @typedef {"Multiply"|"Colorize"|"Add"|"HSVColor"} GEC_Color_Operations
 * @typedef {"Original_Style"|"DropDown_Style"} GEC_ComboBox_Style
 * @typedef {"CutAndPaste"|"CopyAndPaste"|"Custom"|"Copy"|"Cut"} GEC_Dnd_Modes
 * @typedef {"Default"|"Ware_Warehouse"|"Ware_Warehouse_Loading"|"Ware_Warehouse_ItemSocket"|"Ware_Ship"|"Ware_Ship_Loading"|"Ware_Ship_Trading"|"Ware_Ship_ItemSocket"|"Ware_Marketplace"|"Ware_NeutralBase"|"Ware_NeutralBase_Trading"|"Buildmenu"|"ActionBar"|"IngameMenu"|"StrategymapLineModifier"|"StrategymapWaypointSlot"|"SelectionGroupButton"|"Ark"|"Ark_Loading"|"Ark_MainMenu"|"Ark_MainMenu_ItemSocket"|"Ware_Airship_ItemSocket"|"Infobar_Ware"|"Objectmenu_Button"} GEC_Dnd_Types
 * @typedef {"Forbid"|"Allow"} GEC_Filter_Type
 * @typedef {"Flip0"|"Flip1"|"Flip2"|"Flip3"} GEC_Flip_Modes
 * @typedef {"Left"|"Center"|"Right"|"Justify"|"UseStyleSetting"} GEC_Horizontal_Alignment
 * @typedef {"None"|"Fill"|"Left"|"Center"|"Right"} GEC_Horizontal_Layout_Mode
 * @typedef {"Simple"|"Coverflow"|"Circleflow"|"Ubisoft"|"Grid"} GEC_ItemBrowser_Types
 * @typedef {"Column_Order"|"Line_Order"} GEC_LineColumn_Order
 * @typedef {"Fixed"|"ResizeHorzAndVert"|"ResizeVertical"|"ResizeHorizontal"} GEC_ParentResizeMode
 * @typedef {"House_Residents_Portrait"|"Third_Party_Portrait"|"Diplomacy_Current_Player"|"Diplomacy_Orient"|"Diplomacy_Occident"|"Diplomacy_CSP1"|"Diplomacy_CSP2"|"Diplomacy_CSP3"|"Static_Object_Config"} GEC_Render_Type
 * @typedef {"Normal"|"SuperSampling_2x"} GEC_RenderTarget_Quality
 * @typedef {"Spin"|"Linear_Oscillate"|"Sinus_Oscillate"} GEC_Rotation_Type
 * @typedef {"None"|"Stretch"|"Fit_Ratio"|"Zoom_Ratio"|"KeepRatioResizeWidth"|"KeepRatioResizeHeight"|"KeepRatioFullsize"} GEC_ScaleMode
 * @typedef {"None"|"Enabled"|"Enabled_AutoHide"|"Enabled_Reset"|"Enabled_AutoHide_Reset"} GEC_Scrollbar_Type
 * @typedef {"Switch"|"Flip_vertical"|"Flip_horizontal"|"Blend"|"Cut_topdown"|"Cut_downtop"|"Cut_leftright"|"Cut_rightleft"|"Slide_topdown"|"Slide_downtop"|"Slide_leftright"|"Slide_rightleft"} GEC_Tansition_Type
 * @typedef {"Page_Jump"|"Direct_Jump"} GEC_Thumb_Jump_Mode
 * @typedef {"Top"|"Bottom"|"Left"|"Right"|"CursorPos"} GEC_Tooltip_Alignment
 * @typedef {"Top"|"Center"|"Bottom"|"UseStyleSetting"} GEC_Vertical_Alignment
 * @typedef {"None"|"Fill"|"Top"|"Center"|"Bottom"} GEC_Vertical_Layout_Mode
 * @typedef {"AI"|"General"|"Population"|"Game World"|"Building"|"Economy"|"Third Parties"|"Diplomacy"|"Quests"|"Items"|"Science"|"Media"|"Vehicles"|"Military"|"Meta-Game"|"Player Profile"|"Interface"|"Signs and Feedback"|"Music and Sound"} Feature
 * @typedef {"None"|"TraderNotInWorld"|"ActionRunning"|"TreatyCannotBeDissolved"|"IceAge"|"NotEnoughDiplomacyPoints"|"CooldownActive"|"ShipLimitReached"|"EffectRunning"} DiplomacyActionDisabledReason
 * @typedef {"Low"|"Normal"|"High"|"VeryHigh"} DiplomacyLevel
 * @typedef {"Negative"|"Neutral"|"Positive"} DiplomacyPointRate
 * @typedef {"Executor"|"Owner"|"Chosen"} DiplomacyTargetPlayer
 * @typedef {"Unknown"|"Pending"|"Active"|"Ending"|"SuddenDeath"|"Ended"} ConquestSessionStates
 * @typedef {"Team1"|"Team2"|"Team3"|"Team4"} ConquestTeam
 * @typedef {"FromMission"|"AlwaysEco"|"AlwaysTycoon"|"PlayerSelect"} FactionSelection
 * @typedef {"MissionPlayable"|"SessionInactive"|"TeamPlayerAlreadyInMission"|"NoConnectionAvailable"|"PlayerTimeExpired"|"PlayerTimeExpiredForever"} MissionAvailabilityState
 * @typedef {"Normal"|"Fast"} ReplaySpeed
 * @typedef {"Unknown"|"LevelReached"|"PlayerJoined"|"PlayerLeft"|"PlayerStartsMission"} SessionEventType
 * @typedef {"Manual"|"Dossier"} DataLogType
 * @typedef {"Campaign"|"Continuous"|"Challenge"|"Cooperative"|"Conquest"|"WorldEvent"|"Scenario"} MissionType
 * @typedef {"MostPopular"|"New"|"ComingSoon"|"SpecialOffer"|"Promo"|"ShopItem"|"AddonContent"} RewardFlags
 * @typedef {"Reset"|"ClearVector"|"AddVectorItem"|"RemoveVectorItem"|"OpenFile"|"MoveUp"|"MoveDown"} ValueOperation
**/