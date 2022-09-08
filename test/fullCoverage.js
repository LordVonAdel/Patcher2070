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

const showOnlyFails = false;

fs.readdir(contentFolderFilePath, async (err, files) => {
  for (let file of files) {
    if (file.includes(".backup")) continue;
    await testRDA(path.join(contentFolderFilePath, file));
  }
  console.table(stats);
});

const fileTypeTests = {
  "RDM": {
    extension: ".rdm",
    test(data) {
      const rdm = new RDMAsset();
      rdm.readData(data);
    }
  },
  "ISD": {
    ignore: true,
    extension: ".isd",
    test(data) {
      const isd = new ISDAsset();
      isd.readData(data);
    }
  },
  "DDS": {
    extension: ".dds",
    test(data) {
      const asset = new DDSAsset();
      asset.readData(data);
    }
  }
}

async function testRDA(path) {
  const reader = new RDAAsset();
  try {
    console.log("=== Reading file: " + path + " ===");
    await reader.readFile(path);
    const index = reader.getIndex();

    for (let testType in fileTypeTests) {
      const test = fileTypeTests[testType];
      if (test.ignore) continue;

      const invalidStat = testType + "_invalid";
      const validStat = testType + "_valid";

      if (!(invalidStat in stats)) { stats[invalidStat] = 0; stats[validStat] = 0; }

      const files = index.filter(entry => entry.endsWith(test.extension));
      for (const file of files) {
        try {
          const data = reader.extractFile(file);
          test.test(data);
          stats[validStat]++;
        } catch (e) {
          console.log("\x1b[91mFile is invalid:", file, e.message, "\x1b[0m");
          stats[invalidStat]++;
        }
      }
    }


    stats.rdaParsed++;
  } catch (e) {
    console.log("\x1b[91mFailed", e.message, "\x1b[0m");
    stats.rdaFailed++;
  }
}
