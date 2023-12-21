import XMLAsset from "../Common/XMLAsset.js";
import { XMLElement } from "../Common/XMLParser.js";

export default class CFGAsset extends XMLAsset {

    /**
     * @type {XMLElement}
     */
    #root;

    constructor() {
        super();
    }

    readData(data) {
        super.readData(data);
        this.#root = this.xml.findChild("m_Config");
    }

    getModels() {
        return this.#root.findChild("m_Models", 0, true).getChildrenOfType("m_Config").map(xml => new CFGModel(xml));
    }

    get center() {
        return [
            +this.#root.getInlineContent("m_Center.x"),
            +this.#root.getInlineContent("m_Center.y"),
            +this.#root.getInlineContent("m_Center.z")
        ];
    }

    set center(coords) {
        this.#root.setInlineContent(coords[0], "m_Center.x");
        this.#root.setInlineContent(coords[1], "m_Center.y");
        this.#root.setInlineContent(coords[2], "m_Center.z");
    }

    get extend() {
        return [
            +this.#root.getInlineContent("m_Extend.x"),
            +this.#root.getInlineContent("m_Extend.y"),
            +this.#root.getInlineContent("m_Extend.z")
        ];
    }

    set extend(coords) {
        this.#root.setInlineContent(coords[0], "m_Extend.x");
        this.#root.setInlineContent(coords[1], "m_Extend.y");
        this.#root.setInlineContent(coords[2], "m_Extend.z");
    }

    get radius() {
        return +this.#root.getInlineContent("m_Radius");
    }

    set radius(value) {
        this.#root.setInlineContent(value, "m_Radius");
    }

    get configType() {
        return this.#root.getInlineContent("m_ConfigType"); // Usally "ROOT"
    }

    set configType(value) {
        this.#root.setInlineContent(value, "m_ConfigType");
    }
}

class CFGModel {

    /**
     * @type {XMLElement}
     */
    #xml;

    constructor(xml) {
        this.#xml = xml;
    }

    get fileName() { return this.#xml.getInlineContent("m_FileName"); }
    set fileName(value) { this.#xml.setInlineContent(value, "m_FileName"); }
    get configType() { return this.#xml.getInlineContent("m_ConfigType"); /* Usally "MODEL" */ }
    set configType(value) { this.#xml.setInlineContent(value, "m_ConfigType"); }

    getMaterials() {
        return this.#xml.findChild("m_Materials", 0, true).getChildrenOfType("m_Config").map(xml => new CFGMaterial(xml));
    }

}

class CFGMaterial {

    /**
     * @type {XMLElement}
     */
    #xml;

    constructor(xml) {
        this.#xml = xml;
    }

    get configType() { return this.#xml.getInlineContent("m_ConfigType"); /* Usally "MATERIAL" */ }
    set configType(value) { this.#xml.setInlineContent(value, "m_ConfigType"); }
    get name() { return this.#xml.getInlineContent("m_Name"); }
    set name(value) { this.#xml.setInlineContent(value, "m_Name"); }
    get shaderIndex() { return +this.#xml.getInlineContent("m_ShaderIndex"); }

    /**
     * 00 - Default Standardsdf
     * 06 - Defaultdaw
     * 12 - Relocation?
     */
    set shaderIndex(value) { this.#xml.setInlineContent(value, "m_ShaderIndex"); }

    // Colors
    get ambientColor() {
        return [
            +this.#xml.getInlineContent("m_AmbientColor.r"),
            +this.#xml.getInlineContent("m_AmbientColor.g"),
            +this.#xml.getInlineContent("m_AmbientColor.b"),
            +this.#xml.getInlineContent("m_AmbientColor.a")
        ]
    }
    set ambientColor(value) {
        this.#xml.setInlineContent(value[0], "m_AmbientColor.r");
        this.#xml.setInlineContent(value[1], "m_AmbientColor.g");
        this.#xml.setInlineContent(value[2], "m_AmbientColor.b");
        this.#xml.setInlineContent(value[3], "m_AmbientColor.a");
    }

    get diffuseColor() {
        return [
            +this.#xml.getInlineContent("m_DiffuseColor.r"),
            +this.#xml.getInlineContent("m_DiffuseColor.g"),
            +this.#xml.getInlineContent("m_DiffuseColor.b"),
            +this.#xml.getInlineContent("m_DiffuseColor.a")
        ]
    }
    set diffuseColor(value) {
        this.#xml.setInlineContent(value[0], "m_DiffuseColor.r");
        this.#xml.setInlineContent(value[1], "m_DiffuseColor.g");
        this.#xml.setInlineContent(value[2], "m_DiffuseColor.b");
        this.#xml.setInlineContent(value[3], "m_DiffuseColor.a");
    }

    get specularColor() {
        return [
            +this.#xml.getInlineContent("m_SpecularColor.r"),
            +this.#xml.getInlineContent("m_SpecularColor.g"),
            +this.#xml.getInlineContent("m_SpecularColor.b"),
            +this.#xml.getInlineContent("m_SpecularColor.a")
        ]
    }
    set specularColor(value) {
        this.#xml.setInlineContent(value[0], "m_SpecularColor.r");
        this.#xml.setInlineContent(value[1], "m_SpecularColor.g");
        this.#xml.setInlineContent(value[2], "m_SpecularColor.b");
        this.#xml.setInlineContent(value[3], "m_SpecularColor.a");
    }

    get emissiveColor() {
        return [
            +this.#xml.getInlineContent("m_EmissiveColor.r"),
            +this.#xml.getInlineContent("m_EmissiveColor.g"),
            +this.#xml.getInlineContent("m_EmissiveColor.b"),
            +this.#xml.getInlineContent("m_EmissiveColor.a")
        ]
    }
    set emissiveColor(value) {
        this.#xml.setInlineContent(value[0], "m_EmissiveColor.r");
        this.#xml.setInlineContent(value[1], "m_EmissiveColor.g");
        this.#xml.setInlineContent(value[2], "m_EmissiveColor.b");
        this.#xml.setInlineContent(value[3], "m_EmissiveColor.a");
    }

    // Textures
    get diffuseTexture() { return this.#xml.getInlineContent("m_DiffuseTexture"); }
    set diffuseTexture(value) { this.#xml.setInlineContent(value, "m_DiffuseTexture"); }
    get normalTexture() { return this.#xml.getInlineContent("m_NormalTexture"); }
    set normalTexture(value) { this.#xml.setInlineContent(value, "m_NormalTexture"); }
    get heightTexture() { return this.#xml.getInlineContent("m_HeightTexture"); }
    set heightTexture(value) { this.#xml.setInlineContent(value, "m_HeightTexture"); }
    get maskTexture() { return this.#xml.getInlineContent("m_MaskTexture"); }
    set maskTexture(value) { this.#xml.setInlineContent(value, "m_MaskTexture"); }
    get ripplesTexture() { return this.#xml.getInlineContent("m_RipplesTexture"); }
    set ripplesTexture(value) { this.#xml.setInlineContent(value, "m_RipplesTexture"); }

    get vertexFormat() { return this.#xml.getInlineContent("m_VertexFormat"); }
    set vertexFormat(value) { this.#xml.setInlineContent(value, "m_VertexFormat"); }

    get diffuseEnabled() { return this.#xml.getInlineContent("m_DiffuseEnabled"); }
    set diffuseEnabled(value) { this.#xml.setInlineContent(value, "m_DiffuseEnabled"); }
    get normalEnabled() { return this.#xml.getInlineContent("m_NormalEnabled"); }
    set normalEnabled(value) { this.#xml.setInlineContent(value, "m_NormalEnabled"); }
    get environmentEnabled() { return this.#xml.getInlineContent("m_EnvironmentEnabled"); }
    set environmentEnabled(value) { this.#xml.setInlineContent(value, "m_EnvironmentEnabled"); }
    get parallaxEnabled() { return this.#xml.getInlineContent("m_ParallaxEnabled"); }
    set parallaxEnabled(value) { this.#xml.setInlineContent(value, "m_ParallaxEnabled"); }
    get ripplesEnabled() { return this.#xml.getInlineContent("m_RipplesEnabled"); }
    set ripplesEnabled(value) { this.#xml.setInlineContent(value, "m_RipplesEnabled"); }

    get numBonesPerVertex() { return this.#xml.getInlineContent("m_NumBonesPerVertex"); }
    set numBonesPerVertex(value) { this.#xml.setInlineContent(value, "m_NumBonesPerVertex"); }
}