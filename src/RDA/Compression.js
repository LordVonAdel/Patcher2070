import Pako from "pako";

export function Compress(data, options = {}) {
  options.level = 5;
  return Buffer.from(Pako.deflate(data, options));
}

export function Decompress(data) {
  return Buffer.from(Pako.inflate(data));
}