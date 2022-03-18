import { RDMAsset } from "../index.js";
import fs from "fs";
import path from "path";
import XMLParser from "./../Common/XMLParser.js";

const maps = ["Diffuse", "Normal", "Height", "Mask", "Ripples"];

export async function ExtractModel(rda, modelPath, outDir) {
  const asset = new RDMAsset();

  const cfgRaw = rda.extractFile(modelPath);
  const xmlParser = new XMLParser();
  const cfg = xmlParser.parse(cfgRaw);

  const modelConfig = cfg.findChild("m_Config").findChild("m_Models").findChild("m_Config");
  const rdmFile = modelConfig.getInlineContent("m_FileName");
  const materials = modelConfig.findChild("m_Materials").getChildrenOfType("m_Config");
  
  asset.readData(rda.extractFile(rdmFile));

  for (let i = 0; i < materials.length; i++) {
    let material = materials[i];
    let assetMaterial = asset.materials[i];

    assetMaterial.ambientColor = [
      Number(material.getInlineContent("m_AmbientColor.r")),
      Number(material.getInlineContent("m_AmbientColor.g")),
      Number(material.getInlineContent("m_AmbientColor.b")),
      Number(material.getInlineContent("m_AmbientColor.a"))
    ];

    assetMaterial.diffuseColor = [
      Number(material.getInlineContent("m_DiffuseColor.r")),
      Number(material.getInlineContent("m_DiffuseColor.g")),
      Number(material.getInlineContent("m_DiffuseColor.b")),
      Number(material.getInlineContent("m_DiffuseColor.a"))
    ];

    assetMaterial.specularColor = [
      Number(material.getInlineContent("m_SpecularColor.r")),
      Number(material.getInlineContent("m_SpecularColor.g")),
      Number(material.getInlineContent("m_SpecularColor.b")),
      Number(material.getInlineContent("m_SpecularColor.a"))
    ];

    assetMaterial.emissiveColor = [
      Number(material.getInlineContent("m_EmissiveColor.r")),
      Number(material.getInlineContent("m_EmissiveColor.g")),
      Number(material.getInlineContent("m_EmissiveColor.b")),
      Number(material.getInlineContent("m_EmissiveColor.a"))
    ];

    for (let map of maps) {
      let cfgMapPath = material.getInlineContent("m_" + map + "Texture");
      if (!cfgMapPath) continue;

      let filename = findExistingFile(rda, [
        cfgMapPath,
        cfgMapPath.replace(".png", ".dds"),	
        cfgMapPath.replace(".png", "_0.dds") // LOD 0
      ]);

      if (!filename) continue;
      const localFileName = path.basename(filename);
      await fs.promises.writeFile(path.join(outDir, localFileName), rda.extractFile(filename));

      assetMaterial[map.toLowerCase() + "Map"] = localFileName;
    }
  }

  const mtllibName = path.basename(rdmFile, ".rdm") + ".mtl";
  await fs.promises.writeFile(path.join(outDir, path.basename(rdmFile, ".rdm") + ".obj"), asset.exportOBJ(mtllibName));
  await fs.promises.writeFile(path.join(outDir, mtllibName), asset.exportMTL());
}

function findExistingFile(rda, namesToTest) {
  for (let name of namesToTest) {
    if (rda.doesFileExists(name)) return name;
  }
  return null;
}