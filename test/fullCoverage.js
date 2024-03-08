/**
 * This tests tries to read and parse every file in the Anno game folder.
 */
import path from 'path';
import fs from 'fs';
import RDAAsset from '../src/RDA/RDAAsset.js';
import RDMAsset from '../src/RDM/RDMAsset.js';
import DDSAsset from '../src/DDS/DDSAsset.js';
import ISDAsset from '../src/XML/ISDAsset.js';
import CDFAsset from '../src/GUI/CDFAsset.js';

const contentFolderFilePath = 'D:\\SteamLibrary\\steamapps\\common\\Anno 2070\\maindata';
const stats = {
  rdaParsed: 0,
  rdaFailed: 0
};

fs.readdir(contentFolderFilePath, async (err, files) => {
  if (err) {
    console.error(err);
    return;
  }

  for (let file of files) {
    if (file.includes(".backup")) continue;
    await testRDA(path.join(contentFolderFilePath, file));
  }
  console.table(stats);
});

const fileTypeTests = {
  "RDM": {
    ignore: true,
    extension: ".rdm",
    test(data) {
      const rdm = new RDMAsset();
      rdm.readData(data);
    }
  },
  "ISD": {
    ignore: false,
    extension: ".isd",
    test(data) {
      const isd = new ISDAsset();
      isd.readData(data);
    }
  },
  "DDS": {
    ignore: true,
    extension: ".dds",
    test(data) {
      const asset = new DDSAsset();
      asset.readData(data);
    }
  },
  "CDF": {
    ignore: true,
    extension: ".cdf",
    test(data) {
      const asset = new CDFAsset();
      asset.readData(data);
    }
  }
}

async function testRDA(path) {
  if (path.endsWith("checksums.rda")) return;

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
          const data = await reader.extractFile(file);
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
