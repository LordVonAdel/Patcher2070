import XMLAsset from "../Common/XMLAsset.js";
import Path from "path";
import fs from "fs/promises";

export default class EngineIni extends XMLAsset {

  /**
   * @param {EngineIniKey} key 
   */
  getValue(key) {
    if (!this.xml.hasContent()) {
      return null;
    }

    return this.xml.findChild("InitFile").getInlineContent(key);
  }

  /**
   * @param {EngineIniKey} key 
   * @param {*} value 
   */
  setValue(key, value) {
    this.xml.findChild("InitFile").setInlineContent(value, key);
  }

  static GetDefaultFilePath() {
    return Path.join(process.env.APPDATA, "Ubisoft/Anno 2070/Config/Engine.ini")
  }

  static async loadFromDisk() {
    const path = EngineIni.GetDefaultFilePath();
    const engineIni = new EngineIni();

    try {
      await fs.access(path);
      await engineIni.readFile(path);
    } catch (_) {
      
    }

    return engineIni;
  }

 /*
  * @typedef {string} EngineIniKey
  * @readonly
  * @enum {string} EngineIniKey
  */
  static KEYS = {
    ScreenXSize: "ScreenXSize",
    ScreenYSize: "ScreenYSize",
    LastScreenXSize: "LastScreenXSize",
    LastScreenYSize: "LastScreenYSize",
    ScreenDepth: "ScreenDepth",
    ScreenFormat: "ScreenFormat",
    RefreshRate: "RefreshRate",
    AspectRatio: "AspectRatio",
    ResizableWindow: "ResizableWindow",
    NoWindowFrame: "NoWindowFrame",
    Gamma: "Gamma",
    AlwaysShowWaterSurface: "AlwaysShowWaterSurface",
    RE_Device: "RE_Device",
    RE_VSync: "RE_VSync",
    RE_Cloud: "RE_Cloud",
    RE_Framebuffer_Refraction: "RE_Framebuffer_Refraction",
    RE_TerrainRenderMode: "RE_TerrainRenderMode",
    RE_Bloom: "RE_Bloom",
    UseDDSTextures: "UseDDSTextures",
    DirectXVersion: "DirectXVersion",
    EnableTextureMemoryManagement: "EnableTextureMemoryManagement",
    EnableModelMemoryManagement: "EnableModelMemoryManagement",
    PreloadShaders: "PreloadShaders",
    EnableRenderEngineScheduler: "EnableRenderEngineScheduler",
    QualityLevel: "QualityLevel",
    RE_Anisotropic: "RE_Anisotropic",
    RE_Antialiasing: "RE_Antialiasing",
    RE_Effects: "RE_Effects",
    RE_Force: "RE_Force",
    RE_Lighting: "RE_Lighting",
    RE_MaxObjectLOD: "RE_MaxObjectLOD",
    RE_PostEffects: "RE_PostEffects",
    RE_Reflection: "RE_Reflection",
    RE_Refraction: "RE_Refraction",
    RE_Scattering: "RE_Scattering",
    RE_Shadows: "RE_Shadows",
    RE_Terrain: "RE_Terrain",
    RE_TextureManager: "RE_TextureManager",
    RE_Water: "RE_Water",
    EnableUtilization: "EnableUtilization",
    EnableFPS: "EnableFPS",
    EnableGUIWarning: "EnableGUIWarning",
    EnableAI: "EnableAI",
    LanguageTAG: "LanguageTAG",
    Multithreading: "Multithreading",
    PreferLocalFiles: "PreferLocalFiles",
    EnableWatchThreads: "EnableWatchThreads",
    EnableMainMenuPreloading: "EnableMainMenuPreloading",
    EnableFPPPreloading: "EnableFPPPreloading",
    PreloadAll: "PreloadAll",
    RecordCFGCache: "RecordCFGCache",
    ScriptFilename: "ScriptFilename",
    RenderTransportRoute: "RenderTransportRoute",
    SkipIntro: "SkipIntro",
    MinimapRotation: "MinimapRotation",
    EnableTimeDisplay: "EnableTimeDisplay",
    EnableInfoMode: "EnableInfoMode",
    AutoSaveCount: "AutoSaveCount",
    GameSpeed: "GameSpeed",
    SaveReplay: "SaveReplay",
    AutoQuestReminder: "AutoQuestReminder",
    ProfileName: "ProfileName",
    HardwareCursor: "HardwareCursor",
    MouseScroll: "MouseScroll",
    KeyboardScroll: "KeyboardScroll",
    MouseSpeed: "MouseSpeed",
    LockCamera: "LockCamera",
    EnableZoom: "EnableZoom",
    CheckCameraDistance: "CheckCameraDistance",
    EnableConsole: "EnableConsole",
    TimePerChar: "TimePerChar",
    EnableFourthCamPosition: "EnableFourthCamPosition",
    MinimapTexResX: "MinimapTexResX",
    MinimapTexResY: "MinimapTexResY",
    EnableLargeFOV: "EnableLargeFOV",
    m_PickHighlightEnabled: "m_PickHighlightEnabled",
    VolumeMain: "VolumeMain",
    VolumeAmbiente: "VolumeAmbiente",
    VolumeSpeech: "VolumeSpeech",
    VolumeMusic: "VolumeMusic",
    VolumeSound: "VolumeSound",
    VolumeMsg: "VolumeMsg",
    VolumeAck: "VolumeAck",
    SoundSystem: "SoundSystem",
    SoundSystemOutput: "SoundSystemOutput",
    SoundDriver: "SoundDriver",
    SoundEnableBink: "SoundEnableBink",
    FilterEventMsg: "FilterEventMsg",
    FilterEconomyMsg: "FilterEconomyMsg",
    FilterDiplomacyMsg: "FilterDiplomacyMsg",
    FilterResidentMsg: "FilterResidentMsg",
    FilterExplorationMsg: "FilterExplorationMsg",
    FilterResearchMsg: "FilterResearchMsg",
    FilterMilitaryMsg: "FilterMilitaryMsg",
    CheckSumEnabled: "CheckSumEnabled",
    StopOnCheckSumError: "StopOnCheckSumError",
    CheckSumErrorCount: "CheckSumErrorCount",
    IsLogFileOn: "IsLogFileOn",
    KIServerPort: "KIServerPort",
    KIBuildLimitation: "KIBuildLimitation",
    RenderDebugBlock: "RenderDebugBlock",
    ShowAssert: "ShowAssert",
    DisableHPTimer: "DisableHPTimer",
    SyncTraceDisabled: "SyncTraceDisabled",
    WriteMiniDumps: "WriteMiniDumps",
    SyncTraceLogFolder: "SyncTraceLogFolder",
    ScreenshotFormat: "ScreenshotFormat",
    ScreenshotWidth: "ScreenshotWidth",
    ScreenshotHeight: "ScreenshotHeight",
    UbiSurveyTime: "UbiSurveyTime",
    EnableInGameThreadLoading: "EnableInGameThreadLoading",
    EnableThreadLoading: "EnableThreadLoading",
    FixedSun: "FixedSun",
    FeedbackQualityLevel: "FeedbackQualityLevel",
    HttpProxy: "HttpProxy",
    HttpsProxy: "HttpsProxy",
    Port: "Port",
    m_waitForPlayerTimeout: "m_waitForPlayerTimeout",
    ConquestModeURL: "ConquestModeURL",
    ConquestModePort: "ConquestModePort",
    ConquestModeURLUser: "ConquestModeURLUser",
    ConquestModePortUser: "ConquestModePortUser",
    LastUserName: "LastUserName"
  }
}
