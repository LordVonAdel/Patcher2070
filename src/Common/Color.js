export default class Color {

  constructor() {
    this.r = 0;
    this.g = 0;
    this.b = 0;
    this.a = 1;
  }

  toAnnoColor() {
    return Math.round(this.r * 255) << 16 
      | Math.round(this.g * 255) << 8 
      | Math.round(this.b * 255)
      | Math.round(this.a * 255) << 24;
  }

  setRGBA(r, g, b, a) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
  }

  fromHEX(hex) {
    hex = hex.replace("#", "");
    this.r = parseInt(hex.substring(0, 2), 16) / 255;
    this.g = parseInt(hex.substring(2, 4), 16) / 255;
    this.b = parseInt(hex.substring(4, 6), 16) / 255;
  }
}