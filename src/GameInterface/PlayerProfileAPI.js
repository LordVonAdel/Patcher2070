import GameInterface from './GameInterface.js';
import Color from './../Common/Color.js';

export default class PlayerProfileAPI {
  
  /**
   * @param {GameInterface} gameInterface 
   */
  constructor(gameInterface) {
    /**
     * @private
     */
    this.gameInterface = gameInterface;
  }

  async addPlayerColor(hex, guid) {
    const assets = await this.gameInterface.getAssets();
    const color = new Color();
    color.fromHEX(hex);

    const colorAsset = assets.createAsset(
      assets.getGroup("-PlayerProfile.Customization.Colors")
    );
    colorAsset.Template = "ProfileColor";
    colorAsset.Standard.GUID = guid;
    const profileColor = colorAsset.extractValues("ProfileColor");
    profileColor.PlayerColor = color.toAnnoColor();

    const reward = colorAsset.extractValues("Reward");
    reward.RequiresActivation = 0;
    reward.Description = colorAsset.Standard.GUID;
    reward.PreviewPicture = "data\\graphics\\ui\\rewards\\color_08.jpg";
    reward.PreviewPictureThumb = "data\\graphics\\ui\\rewards\\thumbs\\color_08.jpg";

    return colorAsset;
  }

  async addArk(guid) {
    const assets = await this.gameInterface.getAssets();

    const arkAsset = assets.createAsset(
      "Ark" + guid,
      assets.getGroup("Objects.Buildings.tycoons.special")
    );

    arkAsset.Template = "Ark";
    arkAsset.Standard.GUID = guid;
    arkAsset.Object.SnapToGUID = 50005;
    arkAsset.Object.setVariations([
      "data\\graphics\\buildings\\tycoons\\special\\ark_tycoons\\ark_tycoons.cfg"
    ]);
    arkAsset.Ark.Picture = "data\\config\\gui\\Backgrounds\\Prototype\\portraits_buildings\\profile_ark_03.bkg";
    arkAsset.Ark.Thumbnail = "data\\config\\gui\\Backgrounds\\Prototype\\mainmenu_frames\\mainmenu_profile_ark_small_03.bkg";
    arkAsset.Ark.RelocationGhost = "10233";
    arkAsset.Ark.LeavingArk = "10230";
    arkAsset.Building.NeedsStreetHighlights = 0;
    arkAsset.Reward.RequiresActivation = 0;
  }

  async addCommandShipSkin() {
    throw new Error("Not implemented yet!"); // @todo
  }

  async addTitle() {
    throw new Error("Not implemented yet!"); // @todo
  }

  async addPortrait() {
    throw new Error("Not implemented yet!"); // @todo
  }
}