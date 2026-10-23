// Full trace of the 50 Monte-Carlo dropout passes for one respondent: inputs, hidden activations, dropout masks,
// logit and calibrated output of every pass. Same arithmetic and the same random stream as mcPasses() in ann.ts,
// so the animation shows exactly what the model computes (checked by scripts/check-model.mjs).
import { Generator } from './pcg64';
import { preprocess, type AnnModel } from './ann';
import type { Answers } from './types';

export interface Pass {
  mask1: boolean[]; // true = unit kept (64)
  mask2: boolean[]; // (32)
  h1: number[]; // after ReLU and dropout (64)
  h2: number[]; // after ReLU and dropout (32)
  z: number;
  p: number;
}
export interface Trace { x: number[]; pre1: number[]; passes: Pass[]; W: number[][][]; features: string[] }

function dense(x: number[], W: number[][], b: number[]): number[] {
  const out = b.slice();
  for (let i = 0; i < x.length; i++) {
    const xi = x[i];
    if (xi === 0) continue;
    const Wi = W[i];
    for (let j = 0; j < out.length; j++) out[j] += xi * Wi[j];
  }
  return out;
}

export function traceAnn(row: Answers, m: AnnModel, passes = m.mc_passes, seed = 42): Trace {
  const x = preprocess(row, m);
  const W = m.weights.filter((_, i) => i % 2 === 0) as number[][][];
  const b = m.weights.filter((_, i) => i % 2 === 1) as number[][];
  const rng = new Generator(seed);
  const keep = 1 - m.dropout;
  const pre1 = dense(x, W[0], b[0]).map((v) => Math.max(v, 0));
  const out: Pass[] = [];
  for (let t = 0; t < passes; t++) {
    const mask1 = pre1.map(() => rng.random() >= m.dropout);
    const h1 = pre1.map((v, i) => (mask1[i] ? v / keep : 0));
    const pre2 = dense(h1, W[1], b[1]).map((v) => Math.max(v, 0));
    const mask2 = pre2.map(() => rng.random() >= m.dropout);
    const h2 = pre2.map((v, i) => (mask2[i] ? v / keep : 0));
    const z = dense(h2, W[2], b[2])[0];
    const p = 1 / (1 + Math.exp(-(z / m.temperature + (m.bias ?? 0))));
    out.push({ mask1, mask2, h1, h2, z, p });
  }
  return { x, pre1, passes: out, W, features: m.features };
}
