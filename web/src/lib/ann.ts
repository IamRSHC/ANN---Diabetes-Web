// The proposed ANN in the browser: same preprocessing, forward pass, MC dropout, calibration and decision rule as
// app/model.py and api/main.py (verified to match the Python model to ~1e-17).
import { Generator } from './pcg64';
import type { Answers, AnnResult, Driver } from './types';

export interface AnnModel {
  features: string[];
  continuous: string[];
  ordinal: string[];
  bmi_clip: [number, number];
  mu: Record<string, number>;
  sd: Record<string, number>;
  ordinal_min: Record<string, number>;
  ordinal_max: Record<string, number>;
  dropout: number;
  temperature: number;
  bias: number;
  threshold: number;
  tau: number;
  mc_passes: number;
  weights: number[][] | number[][][];
}

let cached: Promise<AnnModel> | null = null;
export function loadAnn(): Promise<AnnModel> {
  if (!cached) cached = fetch('/model/ann_model.json').then((r) => r.json());
  return cached;
}

export function preprocess(row: Answers, m: AnnModel): number[] {
  return m.features.map((f) => {
    let v = Number(row[f as keyof Answers]);
    if (f === 'BMI') v = Math.min(Math.max(v, m.bmi_clip[0]), m.bmi_clip[1]);
    if (m.continuous.includes(f)) v = (v - m.mu[f]) / m.sd[f];
    else if (m.ordinal.includes(f)) v = (v - m.ordinal_min[f]) / (m.ordinal_max[f] - m.ordinal_min[f]);
    return v;
  });
}

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

export function mcPasses(x: number[], m: AnnModel, passes = m.mc_passes, seed = 42): number[] {
  const rng = new Generator(seed);
  const rate = m.dropout;
  const Ws = m.weights.filter((_, i) => i % 2 === 0) as number[][][];
  const bs = m.weights.filter((_, i) => i % 2 === 1) as number[][];
  const out: number[] = [];
  for (let t = 0; t < passes; t++) {
    let h = x;
    for (let k = 0; k < Ws.length - 1; k++) {
      h = dense(h, Ws[k], bs[k]).map((v) => Math.max(v, 0));
      h = h.map((v) => (rng.random() >= rate ? v / (1 - rate) : 0));
    }
    const z = dense(h, Ws[Ws.length - 1], bs[bs.length - 1])[0] / m.temperature + (m.bias ?? 0);
    out.push(1 / (1 + Math.exp(-z)));
  }
  return out;
}

export function riskOf(row: Answers, m: AnnModel): { risk: number; sigma: number; passes: number[] } {
  const p = mcPasses(preprocess(row, m), m);
  const mu = p.reduce((a, b) => a + b, 0) / p.length;
  const sd = Math.sqrt(p.reduce((a, b) => a + (b - mu) ** 2, 0) / p.length);
  return { risk: mu, sigma: sd, passes: p };
}

// Healthiest answer for each modifiable factor. Smoking and alcohol are excluded on purpose: their learned
// effect in this survey is not causal, so showing them as drivers would mislead.
export const HEALTHY: Partial<Record<keyof Answers, number>> = {
  BMI: 23, MentHlth: 0, PhysHlth: 0, GenHlth: 1, HighBP: 0, HighChol: 0, Stroke: 0, HeartDiseaseorAttack: 0,
  PhysActivity: 1, Fruits: 1, Veggies: 1, DiffWalk: 0, NoDocbcCost: 0,
};

export function scoreAnn(row: Answers, m: AnnModel, labels: Record<string, string>): AnnResult {
  const { risk, sigma, passes } = riskOf(row, m);
  const margin = Math.abs(risk - m.threshold) / (sigma + 1e-9);
  const decision = margin < m.tau ? 'refer' : risk >= m.threshold ? 'higher' : 'lower';
  const drivers: Driver[] = [];
  for (const [f, v] of Object.entries(HEALTHY)) {
    const key = f as keyof Answers;
    if (row[key] !== v) {
      const alt = { ...row, [key]: v } as Answers;
      drivers.push({ feature: f, label: labels[f] ?? f, delta: risk - riskOf(alt, m).risk });
    }
  }
  drivers.sort((a, b) => b.delta - a.delta);
  return {
    risk, sigma, passes, margin, decision, drivers,
    band: [Math.max(0, risk - 2 * sigma), Math.min(1, risk + 2 * sigma)],
    threshold: m.threshold, tau: m.tau,
  };
}
