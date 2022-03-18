/**
 * Source: 
 * https://github.com/lysannschlegel/AnnoRDA/blob/master/AnnoRDA/IO/Encryption/EncryptionStream.cs
 * 
 * Seed: https://github.com/lysannschlegel/RDAExplorer/blob/fbc1d7be320b7654382504d765cd8fa309931395/src/RDAExplorer/Misc/BinaryExtension.cs#L9
 */
import LCG from "./LCG.js";
import { Buffer } from "buffer";

export function Decrypt(buffer, seed) {
  const lcg = new LCG(seed, 214013, 2531011);

  const length = buffer.length;
  const out = Buffer.alloc(length);

  for (let i = 0; i < length; i += 2) {
    const value = buffer[i] + (buffer[i + 1] << 8);
    const key = lcg.next();
    const decrypted = value ^ key;
    out[i] = decrypted & 0xff;
    out[i + 1] = (decrypted >> 8) & 0xff;
  }

  if (length % 2 == 1) {
    out[length - 1] = buffer[length - 1]
  }

  return out;
}

export function Encrypt(buffer, seed) {
  return Decrypt(buffer, seed);
}