/**
 * Sources:
 * https://en.wikipedia.org/wiki/Linear_congruential_generator
 * https://github.com/lysannschlegel/AnnoRDA/blob/master/AnnoRDA/IO/Encryption/LinearCongruentialGenerator.cs
 */

export default class LCG {

  constructor(seed, multiplier = 214013, increment = 2531011) {
    this.seed = seed;
    this.multiplier = multiplier;
    this.increment = increment;

    this.x = this.seed;
  }

  current() {
    return (this.x >> 16) & 32767;
  }

  next() {
    this.x = (Math.imul(this.x, this.multiplier) + this.increment) | 0;
    return this.current();
  }

}