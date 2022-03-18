/**
 * This tests tries to read and parse every file in the Anno game folder.
 */
import path from 'path';
import fs from 'fs';
import RDAAsset from '../src/RDA/RDAAsset.js';
import RDMAsset from '../src/RDM/RDMAsset.js';
import DDSAsset from '../src/DDS/DDSAsset.js';
import ISDAsset from '../src/XML/ISDAsset.js';

const contentFolderFilePath = 'F:\\SteamLibrary\\steamapps\\common\\Anno 2070\\maindata';
const stats = {
  modelsParsed: 0,
  modelsFailed: 0,
  rdaParsed: 0,
  rdaFailed: 0,
  islandsParsed: 0,
  islandsFailed: 0,
  ddsParsed: 0,
  ddsFailed: 0
}

const showOnlyFails = true;

fs.readdir(contentFolderFilePath, async (err, files) => {
  for (let file of files) {
    await testRDA(path.join(contentFolderFilePath, file));
  }
  console.table(stats);
});

async function testRDA(path) {
  const reader = new RDAAsset();
  try {
    console.log("=== Reading file: " + path + " ===");
    await reader.readFile(path);
    const index = reader.getIndex();

    // RDM
    const models = index.filter(entry => entry.endsWith(".rdm"));
    for (let model of models) {
      const modelData = reader.extractFile(model);
      const rdm = new RDMAsset();
      try {
        rdm.readData(modelData);
        stats.modelsParsed++;
      } catch (e) {
        console.log("\x1b[91mError reading model:", model, e.message, "\x1b[0m");
        stats.modelsFailed++;
      }
    }

    // ISD
    const islands = index.filter(entry => entry.endsWith(".isd"));
    for (let island of islands) {
      const islandData = reader.extractFile(island);
      const asset = new ISDAsset();
      try {
        asset.readData(islandData);
        stats.islandsParsed++;
      } catch (e) {
        console.log("\x1b[91mError reading island:", island, e.message, "\x1b[0m");
        stats.islandsFailed++;
      }
    }

    // DDS
    const textures = index.filter(entry => entry.endsWith(".dds"));
    for (let dds of textures) {
      const ddsData = reader.extractFile(dds);
      const asset = new DDSAsset();
      try {
        asset.readData(ddsData);
        stats.ddsParsed++;
      } catch (e) {
        console.log("\x1b[91mError reading texture:", dds, e.message, "\x1b[0m");
        stats.ddsFailed++;
      }
    }

    stats.rdaParsed++;
  } catch (e) {
    console.log("\x1b[91mFailed", e.message, "\x1b[0m");
    stats.rdaFailed++;
  }
}
