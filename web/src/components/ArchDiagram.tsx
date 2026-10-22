// Architecture diagram of Model 2 for the How it works page: the layer pipeline inside the Monte-Carlo loop, feeding
// one shared risk axis (the 50 calibrated passes, the μ ± 2σ band, the threshold and the refer zone) and the rule.
// Drawn as inline SVG with the site's colour tokens, so it follows light and dark mode. Phones get a stacked layout.
import { useId } from 'react';
import meta from '../data/meta.json';
import { EXAMPLE, EXAMPLE_PASSES } from '../data/archExample';
import { useMedia } from '../lib/useMedia';

const MONO = "'JetBrains Mono', ui-monospace, Consolas, monospace";
const SANS = 'Inter, system-ui, sans-serif';
const A = meta.ann;
const EX = { mu: EXAMPLE.mu, sd: EXAMPLE.sd, thr: A.threshold, tau: A.tau };

interface TOpt { s?: number; w?: number; c?: string; a?: 'start' | 'middle' | 'end'; f?: string; ls?: string; op?: string }
const esc = (s: string) => s.replace(/</g, '&lt;');
const t = (x: number, y: number, s: string, o: TOpt = {}) =>
  `<text xml:space="preserve" x="${x}" y="${y}" font-family="${o.f ?? MONO}" font-size="${o.s ?? 11}" font-weight="${o.w ?? 400}" fill="${o.c ?? 'var(--muted)'}" text-anchor="${o.a ?? 'start'}"${o.ls ? ` letter-spacing="${o.ls}"` : ''}${o.op ? ` opacity="${o.op}"` : ''}>${s}</text>`;
const line = (x1: number, y1: number, x2: number, y2: number, o: { c?: string; w?: number; d?: string; m?: string } = {}) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${o.c ?? 'var(--muted)'}" stroke-width="${o.w ?? 1.2}"${o.d ? ` stroke-dasharray="${o.d}"` : ''}${o.m ? ` marker-end="url(#${o.m})"` : ''}/>`;
const box = (x: number, y: number, w: number, h: number, o: { f?: string; s?: string; sw?: number; d?: string; r?: number } = {}) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.r ?? 10}" fill="${o.f ?? 'var(--surface2)'}" stroke="${o.s ?? 'var(--border)'}" stroke-width="${o.sw ?? 1}"${o.d ? ` stroke-dasharray="${o.d}"` : ''}/>`;
const defs = (id: string) => `<defs><marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker>
<pattern id="${id}-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="var(--surface)"/><line x1="0" y1="0" x2="0" y2="6" stroke="var(--border)" stroke-width="3"/></pattern></defs>`;

type Kind = 'io' | 'lin' | 'act' | 'drop' | 'cal';
const BLOCKS: [Kind, string, string][] = [
  ['io', 'x', 'ℝ²¹'], ['lin', 'Dense', `21→${A.hidden[0]}`], ['act', 'ReLU', 'ℝ⁶⁴'], ['drop', 'Dropout', `p ${A.dropout}`],
  ['lin', 'Dense', `${A.hidden[0]}→${A.hidden[1]}`], ['act', 'ReLU', 'ℝ³²'], ['drop', 'Dropout', `p ${A.dropout}`], ['lin', 'Dense', `${A.hidden[1]}→1`], ['cal', 'σ(z/T+b)', 'p ∈ (0,1)'],
];
const kindStyle = (id: string, k: Kind) => ({
  io: { f: 'var(--surface)', s: 'var(--text)', c: 'var(--text)', d: '' },
  lin: { f: 'var(--primary)', s: 'var(--primary)', c: 'var(--on-primary)', d: '' },
  act: { f: 'var(--chip)', s: 'var(--chip)', c: 'var(--chip-text)', d: '' },
  drop: { f: `url(#${id}-hatch)`, s: 'var(--muted)', c: 'var(--text)', d: '4 3' },
  cal: { f: 'var(--low-bg)', s: 'var(--low)', c: 'var(--low)', d: '' },
}[k]);
const LOOP_LABEL = `× N = ${A.mc_passes} passes · dropout stays ON at inference`;
const TRAIN: [string, string][] = [['loss', `focal · α ${A.focal_alpha} · γ ${A.focal_gamma}`], ['optimiser', 'Adam · η 1e-3 · batch 512'], ['early stop', 'val PR-AUC · patience 8'], ['params', '3,521 · He init']];

function hist(x0: number, y0: number, w: number, h: number, lo: number, hi: number, bins: number) {
  const X = (v: number) => x0 + ((v - lo) / (hi - lo)) * w;
  const bw = (hi - lo) / bins, c = Array(bins).fill(0) as number[];
  EXAMPLE_PASSES.forEach((p) => { c[Math.min(bins - 1, Math.max(0, Math.floor((p - lo) / bw)))]++; });
  const m = Math.max(...c);
  let s = `<rect x="${X(EX.mu - 2 * EX.sd)}" y="${y0}" width="${X(EX.mu + 2 * EX.sd) - X(EX.mu - 2 * EX.sd)}" height="${h}" fill="var(--primary)" opacity=".08"/>`;
  c.forEach((n, i) => { if (n) { const bh = (n / m) * (h - 6); s += `<rect x="${X(lo + i * bw) + 1}" y="${y0 + h - bh}" width="${X(lo + (i + 1) * bw) - X(lo + i * bw) - 2}" height="${bh}" rx="1.5" fill="var(--primary)" opacity=".9"/>`; } });
  s += line(x0, y0 + h, x0 + w, y0 + h, { c: 'var(--border)' });
  s += line(X(EX.thr), y0 - 4, X(EX.thr), y0 + h, { c: 'var(--high)', d: '4 3', w: 1.5 });
  s += line(X(EX.mu), y0 - 4, X(EX.mu), y0 + h, { c: 'var(--text)', w: 1.5 });
  return s;
}

// shared risk axis: refer zone t ± τσ behind the histogram of passes, threshold and μ, plus the |μ − t| bracket
function riskAxis(id: string, x: number, base: number, w: number, histH: number, compact: boolean) {
  const lo = 0, hi = 0.7, X = (v: number) => x + ((v - lo) / (hi - lo)) * w, top = base - histH;
  let s = `<rect x="${X(EX.thr - EX.tau * EX.sd)}" y="${top}" width="${X(EX.thr + EX.tau * EX.sd) - X(EX.thr - EX.tau * EX.sd)}" height="${histH}" rx="5" fill="var(--refer-bg)" stroke="var(--refer)" stroke-dasharray="3 3" opacity=".7"/>`;
  s += hist(x, top, w, histH, lo, hi, compact ? 22 : 28);
  for (let v = 0; v <= hi + 1e-9; v += compact ? 0.2 : 0.1) s += t(X(v), base + 16, `${Math.round(v * 100)}%`, { a: 'middle', s: 10 });
  s += t(X(EX.thr), top - 6, 't', { a: 'middle', s: 11, w: 600, c: 'var(--high)' });
  s += t(X(EX.mu) + 6, top + 12, `μ = ${EX.mu.toFixed(3)}`, { s: 11, w: 500, c: 'var(--text)' });
  s += `<path d="M${X(EX.thr) + 2} ${top - 18} H ${X(EX.mu) - 2}" stroke="var(--text)" stroke-width="1" marker-end="url(#${id})" marker-start="url(#${id})" fill="none"/>`;
  s += t((X(EX.thr) + X(EX.mu)) / 2, top - 24, `|μ − t| = ${EXAMPLE.margin.toFixed(2)} σ`, { a: 'middle', s: 10.5, c: 'var(--text)' });
  return s;
}

function legend(x: number, y: number, perRow: number) {
  const items: [string, string, string][] = [['var(--primary)', '', `${A.mc_passes} passes`], ['var(--primary)', '.15', 'μ ± 2σ band'], ['var(--refer-bg)', 'zone', 'refer zone t ± τσ'], ['var(--high)', '', `t = ${A.threshold.toFixed(2)}`]];
  let s = '', lx = x, ly = y;
  items.forEach(([c, op, label], i) => {
    if (i > 0 && i % perRow === 0) { lx = x; ly += 18; }
    s += `<rect x="${lx}" y="${ly - 9}" width="11" height="11" rx="3" fill="${c}"${op && op !== 'zone' ? ` opacity="${op}"` : ''}${op === 'zone' ? ' stroke="var(--refer)"' : ''}/>` + t(lx + 16, ly, label, { s: 10.5 });
    lx += 28 + label.length * 6.6;
  });
  return s;
}

function outcomes(x: number, y: number, w: number, gap: number) {
  const rows: [string, string, string, string, boolean][] = [['m < τ', 'Refer to doctor', 'var(--refer)', 'var(--refer-bg)', false], ['μ ≥ t', 'Higher risk', 'var(--high)', 'var(--high-bg)', true], ['μ < t', 'Lower risk', 'var(--low)', 'var(--low-bg)', false]];
  return rows.map(([cond, lab, c, bg, on], i) => {
    const yy = y + i * gap;
    return `<rect x="${x}" y="${yy}" width="${w}" height="28" rx="8" fill="${bg}"${on ? ` stroke="${c}" stroke-width="1.6"` : ''}/>`
      + t(x + 12, yy + 18.5, esc(cond), { s: 11.5, w: 500, c }) + t(x + 70, yy + 18.5, lab, { s: 12.5, w: 600, c, f: SANS })
      + (on ? t(x + w - 10, yy + 18.5, '← example', { a: 'end', s: 10, w: 500, c }) : '');
  }).join('');
}

function ruleText(x: number, y: number) {
  return t(x, y, 'μ = 1/N · Σ pₙ', { s: 13, w: 500, c: 'var(--text)' }) + t(x, y + 22, 'σ = √(1/N · Σ (pₙ − μ)²)', { s: 13, w: 500, c: 'var(--text)' })
    + t(x, y + 44, 'm = |μ − t| / σ', { s: 13, w: 500, c: 'var(--text)' }) + t(x, y + 64, `t = ${A.threshold.toFixed(2)} (F2) · τ = ${A.tau.toFixed(2)}`, { s: 10.5 });
}

function chip(x: number, y: number, k: string, v: string) {
  const w = 18 + (k.length + v.length + 2) * 6.6;
  return { w, s: `<rect x="${x}" y="${y}" width="${w}" height="26" rx="13" fill="var(--surface2)" stroke="var(--border)"/>` + t(x + 12, y + 17, `<tspan fill="var(--muted)">${k}</tspan>  <tspan fill="var(--text)">${v}</tspan>`, { s: 11 }) };
}

function block(id: string, k: Kind, a: string, b: string, x: number, y: number, w: number, h: number, row: boolean) {
  const st = kindStyle(id, k);
  let s = box(x, y, w, h, { f: st.f, s: st.s, d: st.d, r: 8, sw: 1.4 });
  if (k === 'drop') s += row ? `<rect x="${x + 6}" y="${y + 5}" width="${w - 12}" height="${h - 10}" rx="4" fill="var(--surface)" opacity=".94"/>` : `<rect x="${x + 7}" y="${y + h / 2 - 15}" width="${w - 14}" height="30" rx="5" fill="var(--surface)" opacity=".94"/>`;
  const f = k === 'cal' ? MONO : SANS;
  if (row) return s + t(x + 14, y + h / 2 + 4.5, a, { s: 12.5, w: 600, c: st.c, f }) + t(x + w - 14, y + h / 2 + 4, b, { a: 'end', s: 10.5, c: st.c });
  return s + t(x + w / 2, y + h / 2 - 2, a, { a: 'middle', s: 12, w: 600, c: st.c, f }) + t(x + w / 2, y + h / 2 + 14, b, { a: 'middle', s: 10, c: st.c });
}

function desktop(id: string) {
  const W = 1000, H = 492;
  let s = defs(id);
  // pipeline
  const widths = [54, 80, 56, 68, 80, 56, 68, 76, 104], y = 56, h = 50;
  const gap = (920 - widths.reduce((a, b) => a + b, 0)) / (widths.length - 1);
  let x = 40; const xs: [number, number][] = [];
  BLOCKS.forEach(([k, a, b], i) => {
    s += block(id, k, a, b, x, y, widths[i], h, false); xs.push([x, widths[i]]);
    if (i < BLOCKS.length - 1) s += line(x + widths[i] + 3, y + h / 2, x + widths[i] + gap - 3, y + h / 2, { m: id });
    x += widths[i] + gap;
  });
  const bx = xs[1][0] - 10, bx2 = xs[8][0] + xs[8][1] + 10, calX = xs[8][0] + xs[8][1] / 2;
  s += `<rect x="${bx}" y="${y - 26}" width="${bx2 - bx}" height="${h + 42}" rx="14" fill="none" stroke="var(--primary)" stroke-width="1.3" stroke-dasharray="6 5" opacity=".7"/>`;
  s += `<rect x="${bx + 14}" y="${y - 36}" width="330" height="20" rx="10" fill="var(--surface)"/>` + t(bx + 24, y - 22, LOOP_LABEL, { s: 11, w: 500, c: 'var(--primary)' });
  s += `<path d="M${calX} ${y + h + 18} V 164" stroke="var(--muted)" stroke-width="1.2" fill="none" marker-end="url(#${id})"/>` + t(calX - 10, 150, '{p₁ … p₅₀}', { a: 'end', s: 10.5 });
  // chart
  const cx = 384, cw = 556, base = 362;
  s += box(cx - 16, 170, cw + 32, 246, { r: 14 }) + t(cx, 194, 'ONE AXIS: UNCERTAINTY AND DECISION', { s: 10, ls: '.12em' });
  s += riskAxis(id, cx, base, cw, 126, false) + legend(cx, base + 40, 4);
  // rule
  s += box(40, 170, 300, 246, { r: 14 }) + t(56, 194, 'RULE', { s: 10, ls: '.12em' }) + ruleText(56, 222) + outcomes(56, 300, 268, 36);
  s += line(cx - 20, 293, 344, 293, { m: id });
  // training
  s += t(40, 446, 'TRAINING', { s: 10, ls: '.12em' });
  let tx = 40; TRAIN.forEach(([k, v]) => { const c = chip(tx, 456, k, v); s += c.s; tx += c.w + 10; });
  return { W, H, s };
}

function phone(id: string) {
  const W = 360, bh = 30, g = 8, x0 = 30, bw = 300;
  let s = defs(id), y = 46;
  s += t(16, 20, `× N = ${A.mc_passes} passes`, { s: 11, w: 500, c: 'var(--primary)' }) + t(16, 34, 'dropout stays ON at inference', { s: 10, c: 'var(--primary)' });
  const frameTop = y - 6;
  BLOCKS.forEach(([k, a, b], i) => {
    s += block(id, k, a, b, x0, y, bw, bh, true);
    if (i < BLOCKS.length - 1) s += line(x0 + bw / 2, y + bh + 1, x0 + bw / 2, y + bh + g - 1, { w: 1 });
    y += bh + g;
  });
  s = s.replace(defs(id), defs(id) + `<rect x="16" y="${frameTop}" width="328" height="${y - frameTop - 2}" rx="12" fill="none" stroke="var(--primary)" stroke-width="1.3" stroke-dasharray="6 5" opacity=".7"/>`);
  s += line(W / 2, y + 2, W / 2, y + 22, { m: id }) + t(W / 2 + 8, y + 16, '{p₁ … p₅₀}', { s: 10 });
  y += 30;
  const cy = y; s += box(8, cy, 344, 270, { r: 14 }) + t(22, cy + 22, 'ONE AXIS: UNCERTAINTY AND DECISION', { s: 9.5, ls: '.08em' });
  s += riskAxis(id, 26, cy + 200, 308, 112, true) + legend(26, cy + 238, 2);
  y = cy + 270 + 12;
  s += box(8, y, 344, 218, { r: 14 }) + t(22, y + 22, 'RULE', { s: 10, ls: '.12em' }) + ruleText(22, y + 48) + outcomes(22, y + 124, 316, 32);
  y += 218 + 24;
  s += t(16, y, 'TRAINING', { s: 10, ls: '.12em' }); y += 10;
  TRAIN.forEach(([k, v]) => { s += chip(16, y, k, v).s; y += 32; });
  return { W, H: y + 4, s };
}

export default function ArchDiagram() {
  const small = useMedia('(max-width: 760px)');
  const id = `arch${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const { W, H, s } = small ? phone(id) : desktop(id);
  return (
    <svg className="arch-svg" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" style={small ? { maxWidth: 480, margin: '0 auto', display: 'block' } : { display: 'block' }}
      aria-label={`Model 2 architecture: input of 21 answers, Dense 21 to 64 with ReLU and dropout 0.2, Dense 64 to 32 with ReLU and dropout 0.2, Dense 32 to 1, calibration sigma of z over T plus b, repeated for ${A.mc_passes} Monte-Carlo dropout passes. The mean and spread of the passes give the risk and uncertainty; the person is referred to a doctor when the margin from the threshold is below tau.`}
      dangerouslySetInnerHTML={{ __html: s }} />
  );
}
