import ZLib from 'zlib';

export function Compress(data, options = {}) {
  options.level = 5;
  return new Promise((resolve, reject) => {
    ZLib.deflate(data, options, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

export async function Decompress(data) {
  return new Promise((resolve, reject) => {
    ZLib.inflate(data, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}