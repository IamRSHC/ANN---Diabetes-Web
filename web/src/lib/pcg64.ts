// numpy.random.default_rng(seed) reproduced exactly: SeedSequence -> PCG64 (XSL-RR) -> random() doubles.
// This makes the browser's Monte Carlo dropout masks identical to the Python app and API.
const M32 = 0xffffffffn;
const M64 = (1n << 64n) - 1n;
const M128 = (1n << 128n) - 1n;
const MULT128 = 0x2360ed051fc65da44385df649fccf645n;
const INIT_A = 0x43b0d7e5, MULT_A = 0x931e8875, INIT_B = 0x8b51f9dd, MULT_B = 0x58f38ded;
const MIX_MULT_L = 0xca01f9dd, MIX_MULT_R = 0x4973f715, XSHIFT = 16;
const mul32 = (a: number, b: number) => Number((BigInt(a >>> 0) * BigInt(b >>> 0)) & M32);

function seedSequenceState(seed: number, nWords64: number): bigint[] {
  const poolSize = 4;
  const pool: number[] = new Array(poolSize);
  let hc = INIT_A;
  const hashmix = (v: number) => {
    v = (v ^ hc) >>> 0;
    hc = mul32(hc, MULT_A);
    v = mul32(v, hc);
    return (v ^ (v >>> XSHIFT)) >>> 0;
  };
  const mix = (x: number, y: number) => {
    const r = Number((BigInt(mul32(MIX_MULT_L, x)) - BigInt(mul32(MIX_MULT_R, y))) & M32);
    return (r ^ (r >>> XSHIFT)) >>> 0;
  };
  const entropy = [seed >>> 0];
  for (let i = 0; i < poolSize; i++) pool[i] = hashmix(i < entropy.length ? entropy[i] : 0);
  for (let s = 0; s < poolSize; s++) for (let d = 0; d < poolSize; d++) if (s !== d) pool[d] = mix(pool[d], hashmix(pool[s]));
  const out32: number[] = [];
  let h = INIT_B;
  for (let i = 0; i < nWords64 * 2; i++) {
    let v = (pool[i % poolSize] ^ h) >>> 0;
    h = mul32(h, MULT_B);
    v = mul32(v, h);
    out32.push((v ^ (v >>> XSHIFT)) >>> 0);
  }
  const out64: bigint[] = [];
  for (let i = 0; i < nWords64; i++) out64.push((BigInt(out32[2 * i + 1]) << 32n) | BigInt(out32[2 * i]));
  return out64;
}

export class Generator {
  private state = 0n;
  private inc: bigint;
  constructor(seed: number) {
    const v = seedSequenceState(seed, 4);
    const initstate = (v[0] << 64n) | v[1];
    const initseq = (v[2] << 64n) | v[3];
    this.inc = ((initseq << 1n) | 1n) & M128;
    this.step();
    this.state = (this.state + initstate) & M128;
    this.step();
  }
  private step() {
    this.state = (this.state * MULT128 + this.inc) & M128;
  }
  nextUint64(): bigint {
    this.step();
    const s = this.state;
    const rot = Number(s >> 122n);
    const x = ((s >> 64n) ^ s) & M64;
    return rot === 0 ? x : ((x >> BigInt(rot)) | (x << BigInt(64 - rot))) & M64;
  }
  random(): number {
    return Number(this.nextUint64() >> 11n) / 9007199254740992;
  }
}
