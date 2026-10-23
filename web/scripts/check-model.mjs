// Checks that the in-browser ANN (src/lib/ann.ts) gives the same risk, sigma and decision as the Python model.
// Reference values in reference_profiles.json were produced by app/model.py. Run: npm run test:model
import { build } from 'esbuild';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const out = await build({ stdin: { contents: "export { scoreAnn, mcPasses, preprocess } from './src/lib/ann.ts'; export { traceAnn } from './src/lib/trace.ts';", resolveDir: root, loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', write: false });
const dir = mkdtempSync(join(tmpdir(), 'ann-check-'));
const file = join(dir, 'ann.mjs');
writeFileSync(file, out.outputFiles[0].text);
const { scoreAnn, mcPasses, preprocess, traceAnn } = await import(pathToFileURL(file).href);
rmSync(dir, { recursive: true, force: true });

const model = JSON.parse(readFileSync(join(root, 'public/model/ann_model.json'), 'utf8'));
const refs = JSON.parse(readFileSync(join(here, 'reference_profiles.json'), 'utf8'));
let failed = 0;
for (const r of refs) {
  const got = scoreAnn(r.input, model, {});
  // the animation's trace must reproduce every pass exactly
  const tr = traceAnn(r.input, model).passes.map((p) => p.p), mc = mcPasses(preprocess(r.input, model), model);
  const traceOk = tr.length === mc.length && tr.every((p, i) => p === mc[i]);
  const ok = traceOk && Math.abs(got.risk - r.risk) < 1e-9 && Math.abs(got.sigma - r.sigma) < 1e-9 && got.decision === r.decision && got.passes.length === 50;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${r.name.padEnd(34)} JS ${(got.risk * 100).toFixed(2).padStart(6)}%  Python ${(r.risk * 100).toFixed(2).padStart(6)}%  |diff| ${Math.abs(got.risk - r.risk).toExponential(1)}  ${got.decision}  animation ${traceOk ? 'exact' : 'MISMATCH'}`);
}
console.log(failed ? `\n${failed} profile(s) differ from the Python model.` : `\nAll ${refs.length} profiles match the Python model.`);
process.exit(failed ? 1 : 0);
