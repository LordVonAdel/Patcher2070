import XMLAsset from "../Common/XMLAsset.js";

/**
 * Datasets are hardcoded in Anno5.exe and are not immutable.
 */
export default class DatasetsAsset extends XMLAsset {

  constructor() {
    super();
    this.sets = [];
  }

  readData(data) {
    super.readData(data);

    this.xml.traverse(node => {
      if (node.name == "DataSet") {
        this.sets.push(new Dataset(node));
      }
    });
  }

  getDatasetNames() {
    return this.sets.map(d => d.name);
  }

  getDataset(name) {
    let lower = name.toLowerCase();
    return this.sets.find(item => item.name.toLowerCase() == lower);
  }

  static SETS = {
    ResourceTypes: "ResourceTypes",
    Product: "Product"
  }

}

class Dataset {

  constructor(xml) {
    this.xml = xml;
    this.itemsElement = this.xml.findChild("Items");
  }

  getItemNames() {
    const items = this.itemsElement.getChildrenOfType("Item");
    return items.map(item => new DatasetItem(item));
  }

  get name() {
    return this.xml.getInlineContent("Name");
  }
}

class DatasetItem {

  constructor(xml) {
    this.xml = xml;
  }

  get name() {
    return this.xml.getInlineContent("Name");
  }

  get description() {
    return this.xml.getInlineContent("Description");
  }

}