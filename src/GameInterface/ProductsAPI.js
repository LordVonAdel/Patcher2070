/**
 * @enum {string}
 */
export const WAREHOUSE_CATEGORY = {
  TYPE1: "Type1", // Stage 1
  TYPE2: "Type2", // Stage 2
  TYPE3: "Type3", // Stage 3
  TYPE4: "Type4", // Stage 4
  TYPE5: "Type5", // Techs
}

export default class ProductsAPI {
  constructor(gameInterface) {
    /**
     * @private
     */
    this.gameInterface = gameInterface;
  }
}