// Animated walkthrough of one prediction by Model 2. Everything is computed live from the trained weights: real
// inputs, real activations, the real dropout masks of all 50 passes, real logits and calibrated outputs.
// The picture at any moment is a pure function of the playback time t, so it can be paused and scrubbed.
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadAnn, type AnnModel } from '../lib/ann';
import { traceAnn, type Trace } from '../lib/trace';
import { DEFAULT_ANSWERS, LABELS } from '../lib/questions';
import { useStore } from '../lib/store';
import type { Answers } from '../lib/types';
import { Back } from '../components/Icons';
import { PHONE, useMedia } from '../lib/useMedia';

const MONO = "'JetBrains Mono', ui-monospace, Consolas, monospace";
const N1 = 14, N2 = 10; // units drawn per hidden layer (of 64 and 32)

const PROFILES: { key: string; label: string; row: Answers; note: string }[] = [
  { key: 'higher', label: 'Higher risk example', row: { ...DEFAULT_ANSWERS, BMI: 36, HighBP: 1, HighChol: 1, DiffWalk: 1 }, note: 'female, 50-54, BMI 36, high BP and cholesterol, difficulty walking' },
  { key: 'refer', label: 'Uncertain example', row: { ...DEFAULT_ANSWERS, Sex: 1, HighChol: 1 }, note: 'male, 50-54, BMI 26, high cholesterol' },
  { key: 'lower', label: 'Lower risk example', row: { ...DEFAULT_ANSWERS }, note: 'female, 50-54, BMI 26, no conditions' },
];

// ---------- timeline ----------
type Phase = 'input' | 'l1' | 'h1' | 'l2' | 'h2' | 'out' | 'cal' | 'hist';
const SLOW: [Phase, number][] = [['l1', 1.0], ['h1', 0.7], ['l2', 0.9], ['h2', 0.6], ['out', 0.7], ['cal', 0.9], ['hist', 0.7]];
interface Seg { pass: number; phase: Phase | 'decide'; start: number; dur: number }
function buildTimeline(n: number): { segs: Seg[]; total: number } {
  const segs: Seg[] = [];
  let t = 0;
  segs.push({ pass: 0, phase: 'input', start: 0, dur: 1.4 }); t = 1.4;
  for (let k = 0; k < n; k++) {
    const f = k < 3 ? 1 : k < 6 ? 0.2 : 0.055;
    for (const [ph, d] of SLOW) { segs.push({ pass: k, phase: ph, start: t, dur: d * f }); t += d * f; }
  }
  segs.push({ pass: n - 1, phase: 'decide', start: t, dur: 3 }); t += 3;
  return { segs, total: t };
}
const ORDER: (Phase | 'decide')[] = ['input', 'l1', 'h1', 'l2', 'h2', 'out', 'cal', 'hist', 'decide'];
const at = (seg: Seg, ph: Phase | 'decide') => ORDER.indexOf(seg.phase) > ORDER.indexOf(ph) || (seg.phase === ph);
const ease = (u: number) => (u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2);

// ---------- geometry of the network drawing ----------
const VW = 660, VH = 520;
const X0 = 168, X1 = 352, X2 = 504, XZ = 618, ZY = 268;
const Y0 = Array.from({ length: 21 }, (_, i) => 84 + i * 18.6);
const spread = (n: number, top: number, bot: number) => { const ys: number[] = []; const step = (bot - top) / (n + 1); for (let i = 0; i < n; i++) ys.push(top + step * (i + (i >= n / 2 ? 2 : 0.5))); return ys; };
const Y1 = spread(N1, 70, 470), Y2 = spread(N2, 120, 420);

const BaseEdges = memo(function BaseEdges() {
  const l: JSX.Element[] = [];
  Y0.forEach((a, i) => Y1.forEach((b, j) => l.push(<line key={`a${i}-${j}`} x1={X0} y1={a} x2={X1} y2={b} />)));
  Y1.forEach((a, i) => Y2.forEach((b, j) => l.push(<line key={`b${i}-${j}`} x1={X1} y1={a} x2={X2} y2={b} />)));
  Y2.forEach((a, i) => l.push(<line key={`c${i}`} x1={X2} y1={a} x2={XZ} y2={ZY} />));
  return <g stroke="var(--primary)" strokeWidth={0.6} opacity={0.08}>{l}</g>;
});

interface Edge { x1: number; y1: number; x2: number; y2: number; c: number }
function Pulses({ edges, prog }: { edges: Edge[]; prog: number }) {
  if (!edges.length) return null;
  const max = Math.max(...edges.map((e) => Math.abs(e.c)), 1e-9);
  const u = ease(Math.min(1, prog));
  return (
    <g>
      {edges.map((e, i) => {
        const w = 0.6 + 2.4 * (Math.abs(e.c) / max), col = e.c >= 0 ? 'var(--primary)' : 'var(--high)';
        const px = e.x1 + (e.x2 - e.x1) * u, py = e.y1 + (e.y2 - e.y1) * u;
        return (
          <g key={i}>
            <line x1={e.x1} y1={e.y1} x2={px} y2={py} stroke={col} strokeWidth={w} opacity={0.55} strokeLinecap="round" />
            {u < 1 && <circle cx={px} cy={py} r={2.2 + w * 0.5} fill={col} />}
          </g>
        );
      })}
    </g>
  );
}

function top<T>(arr: T[], k: number, score: (x: T) => number) { return [...arr].sort((a, b) => score(b) - score(a)).slice(0, k); }

// ---------- page ----------
export default function NetworkAnimation() {
  const { result } = useStore();
  const [model, setModel] = useState<AnnModel | null>(null);
  const profiles = useMemo(() => (result ? [...PROFILES, { key: 'you', label: 'Your result', row: result.input, note: 'your last screening' }] : PROFILES), [result]);
  const [pkey, setPkey] = useState('higher');
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [speed, setSpeed] = useState(1);
  const ph = useMedia(PHONE); // phones: larger, shorter labels in the network drawing
  const fs = (n: number) => (ph ? n * 1.55 : n);
  useEffect(() => { loadAnn().then(setModel); }, []);

  const profile = profiles.find((p) => p.key === pkey) ?? profiles[0];
  const tr: Trace | null = useMemo(() => (model ? traceAnn(profile.row, model) : null), [model, profile]);
  const n = model?.mc_passes ?? 50;
  const { segs, total } = useMemo(() => buildTimeline(n), [n]);

  // playback loop
  const last = useRef<number | null>(null);
  useEffect(() => {
    if (!playing) { last.current = null; return; }
    let raf = 0;
    const tick = (now: number) => {
      const dt = last.current == null ? 0 : (now - last.current) / 1000;
      last.current = now;
      setT((v) => { const nv = v + dt * speed; if (nv >= total) { setPlaying(false); return total; } return nv; });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, total]);
  useEffect(() => { setT(0); setPlaying(true); }, [pkey]);

  // units to draw: the hidden units with the largest activations for this person
  const show1 = useMemo(() => (tr ? top([...Array(tr.pre1.length).keys()], N1, (i) => tr.pre1[i]).sort((a, b) => a - b) : []), [tr]);
  const show2 = useMemo(() => (tr ? top([...Array(tr.passes[0].h2.length).keys()], N2, (j) => tr.passes.reduce((s, p) => s + p.h2[j], 0)).sort((a, b) => a - b) : []), [tr]);

  if (!model || !tr) return <div className="na-page"><p className="muted">Loading the trained model…</p></div>;

  // ---- state at time t ----
  const seg = segs.find((s) => t < s.start + s.dur) ?? segs[segs.length - 1];
  const prog = Math.min(1, (t - seg.start) / seg.dur);
  const k = seg.pass, P = tr.passes[k], A = model;
  const done = seg.phase === 'decide';
  const inHist = tr.passes.slice(0, k + (at(seg, 'hist') && (seg.phase !== 'hist' || prog > 0.5) ? 1 : 0)).map((p) => p.p);
  const cnt = inHist.length;
  const mu = cnt ? inHist.reduce((a, b) => a + b, 0) / cnt : 0;
  const sd = cnt ? Math.sqrt(inHist.reduce((a, b) => a + (b - mu) ** 2, 0) / cnt) : 0;
  const margin = cnt > 1 ? Math.abs(mu - A.threshold) / (sd + 1e-9) : NaN;
  const decision = cnt < 2 ? null : margin < A.tau ? 'refer' : mu >= A.threshold ? 'higher' : 'lower';


  const lit0 = at(seg, 'input') ? (seg.phase === 'input' ? prog : 1) : 0;
  const showH1 = at(seg, 'h1') && seg.phase !== 'l1';
  const showH2 = at(seg, 'h2') && !['l1', 'h1', 'l2'].includes(seg.phase);
  const showZ = at(seg, 'out') && !['l1', 'h1', 'l2', 'h2'].includes(seg.phase);
  const max1 = Math.max(...show1.map((i) => P.h1[i]), 1e-9), max2 = Math.max(...show2.map((j) => P.h2[j]), 1e-9);

  let edges: Edge[] = [];
  if (seg.phase === 'l1') {
    const all: Edge[] = []; tr.x.forEach((xv, i) => show1.forEach((u, j) => all.push({ x1: X0, y1: Y0[i], x2: X1, y2: Y1[j], c: xv * tr.W[0][i][u] })));
    edges = top(all, 34, (e) => Math.abs(e.c));
  } else if (seg.phase === 'l2') {
    const all: Edge[] = []; show1.forEach((u, i) => { if (P.mask1[u]) show2.forEach((v, j) => all.push({ x1: X1, y1: Y1[i], x2: X2, y2: Y2[j], c: P.h1[u] * tr.W[1][u][v] })); });
    edges = top(all, 28, (e) => Math.abs(e.c));
  } else if (seg.phase === 'out') {
    edges = show2.filter((v) => P.mask2[v]).map((v) => ({ x1: X2, y1: Y2[show2.indexOf(v)], x2: XZ, y2: ZY, c: P.h2[v] * tr.W[2][v][0] }));
  }
  const fast = k >= 3 && !done;
  const ended = t >= total - 0.05;
  const off1 = P.mask1.filter((m) => !m).length, off2 = P.mask2.filter((m) => !m).length;
  const f3 = (v: number) => v.toFixed(3), pct = (v: number) => `${(v * 100).toFixed(1)}%`;

  const narration = (() => {
    if (done) return `After ${n} passes: μ = ${f3(mu)}, σ = ${f3(sd)}, m = |μ − t| / σ = ${margin.toFixed(2)} ${margin < A.tau ? '< τ, so the model refers this person to a doctor' : `≥ τ = ${A.tau.toFixed(2)}, and μ ${mu >= A.threshold ? '≥' : '<'} t, so the decision is ${mu >= A.threshold ? 'higher' : 'lower'} risk`}.`;
    if (seg.phase === 'input') return `Input x ∈ ℝ²¹ for this person: 14 binary answers, BMI and the two day counts standardised, 4 ordinal answers scaled to 0–1.`;
    if (fast) return `Passes 4–${n}: the same weights every time, a new random dropout mask each pass. Pass ${k + 1} of ${n}.`;
    switch (seg.phase) {
      case 'l1': return `Pass ${k + 1}/${n} · h₁ = ReLU(W₁x + b₁), 21 → 64. Line thickness = size of each input's contribution wᵢⱼ·xᵢ (red = negative).`;
      case 'h1': return `Dropout p = ${A.dropout}: this pass switches off ${off1} of 64 units (dashed); the rest are scaled by 1/(1 − p).`;
      case 'l2': return `h₂ = ReLU(W₂h₁ + b₂), 64 → 32. Dropped units send nothing.`;
      case 'h2': return `Dropout on layer 2: ${off2} of 32 units off in this pass.`;
      case 'out': return `z = W₃h₂ + b₃ = ${P.z.toFixed(3)}`;
      case 'cal': return `Calibration: p = σ(z / T + b) = σ(${P.z.toFixed(3)} / ${A.temperature.toFixed(3)} ${A.bias < 0 ? '−' : '+'} ${Math.abs(A.bias).toFixed(3)}) = ${f3(P.p)}`;
      default: return `p${k + 1} = ${f3(P.p)} joins the histogram. Running μ = ${f3(mu)}, σ = ${f3(sd)} over ${cnt} pass${cnt === 1 ? '' : 'es'}.`;
    }
  })();

  // histogram range fixed from all 50 passes so the axis does not jump while it fills
  const allP = tr.passes.map((p) => p.p), fsd = Math.sqrt(allP.reduce((a, b) => a + (b - allP.reduce((x, y) => x + y, 0) / n) ** 2, 0) / n);
  const lo = Math.max(0, Math.min(...allP, A.threshold - A.tau * fsd) - 0.02), hi = Math.min(1, Math.max(...allP, A.threshold + A.tau * fsd) + 0.02);
  const HW = 300, HH = 110, bins = 24, bw = (hi - lo) / bins;
  const counts = Array(bins).fill(0) as number[];
  inHist.forEach((p) => { counts[Math.min(bins - 1, Math.max(0, Math.floor((p - lo) / bw)))]++; });
  const hx = (v: number) => ((v - lo) / (hi - lo)) * HW;
  const ymax = Math.max(4, ...(() => { const c = Array(bins).fill(0) as number[]; allP.forEach((p) => { c[Math.min(bins - 1, Math.max(0, Math.floor((p - lo) / bw)))]++; }); return c; })());

  const DEC = { refer: ['Refer to doctor', 'var(--refer)', 'var(--refer-bg)'], higher: ['Higher risk', 'var(--high)', 'var(--high-bg)'], lower: ['Lower risk', 'var(--low)', 'var(--low-bg)'] } as const;

  return (
    <div className="na-page">
      <div className="stack" style={{ gap: 8 }}>
        <Link to="/how-it-works" className="na-back"><Back /> How it works</Link>
        <h1 style={{ fontSize: 'clamp(26px, 3.6vw, 38px)' }}>Watch the network run</h1>
        <p className="muted">One prediction by Model 2, computed live from the trained weights: the real activations, the real dropout masks of all {n} passes, and how they turn into a calibrated risk, an uncertainty and a decision.</p>
      </div>

      <div className="na-profiles" role="radiogroup" aria-label="Example person">
        {profiles.map((p) => <button key={p.key} role="radio" aria-checked={p.key === pkey} className={`opt${p.key === pkey ? ' on' : ''}`} onClick={() => setPkey(p.key)}>{p.label}</button>)}
        <span className="small muted">{profile.note}</span>
      </div>

      <div className="card na-stage">
        <div className="na-net">
          <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" role="img" aria-label="Animated neural network: inputs, two hidden layers with dropout, and the output logit">
            <defs><marker id="na-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--muted)" /></marker></defs>
            {(ph ? [[X0, 'INPUT', 'x ∈ ℝ²¹'], [X1, 'HIDDEN 1', '64·ReLU'], [X2, 'HIDDEN 2', '32·ReLU'], [XZ, 'OUT', 'z']] : [[X0, 'INPUT', 'x ∈ ℝ²¹'], [X1, 'HIDDEN 1', 'Dense 64 · ReLU'], [X2, 'HIDDEN 2', 'Dense 32 · ReLU'], [XZ, 'OUTPUT', 'logit z']]).map(([x, a, b]) => (
              <g key={a as string} fontFamily={MONO} textAnchor="middle">
                <text x={x} y={ph ? 20 : 24} fontSize={fs(10)} letterSpacing={ph ? ".08em" : ".12em"} fill="var(--muted)">{a}</text>
                <text x={x} y={ph ? 46 : 42} fontSize={fs(12)} fontWeight={500} fill="var(--text)">{b}</text>
              </g>
            ))}
            <BaseEdges />
            <Pulses edges={edges} prog={prog} />
            {/* input groups */}
            {([[0, 14, 'binary'], [14, 17, 'continuous'], [17, 21, 'ordinal']] as const).map(([a, b, name]) => {
              const y1 = Y0[a] - 7, y2 = Y0[b - 1] + 7;
              return (
                <g key={name} fontFamily={MONO}>
                  <path d={`M146 ${y1} h-6 v${y2 - y1} h6`} fill="none" stroke="var(--border)" strokeWidth={1.2} />
                  <text x={132} y={(y1 + y2) / 2 - 2} fontSize={fs(13)} fontWeight={500} fill="var(--text)" textAnchor="end">{b - a}</text>
                  <text x={132} y={(y1 + y2) / 2 + fs(12)} fontSize={fs(10)} fill="var(--muted)" textAnchor="end">{name}</text>
                </g>
              );
            })}
            {tr.x.map((v, i) => (
              <circle key={i} cx={X0} cy={Y0[i]} r={5.5} fill="var(--primary)" fillOpacity={0.12 + 0.88 * Math.min(1, Math.abs(v)) * lit0} stroke="var(--primary)" strokeWidth={1}>
                <title>{`${LABELS[tr.features[i]] ?? tr.features[i]}: ${v.toFixed(2)}`}</title>
              </circle>
            ))}
            {show1.map((u, i) => {
              const off = showH1 && !P.mask1[u];
              return <circle key={u} cx={X1} cy={Y1[i]} r={7.5} fill={off || !showH1 ? 'var(--surface)' : 'var(--primary)'} fillOpacity={off || !showH1 ? 1 : 0.15 + 0.85 * (P.h1[u] / max1)} stroke={off ? 'var(--muted)' : 'var(--primary)'} strokeWidth={off ? 1.2 : 1.8} strokeDasharray={off ? '2.5 2' : undefined} />;
            })}
            {show2.map((v, j) => {
              const off = showH2 && !P.mask2[v];
              return <circle key={v} cx={X2} cy={Y2[j]} r={7.5} fill={off || !showH2 ? 'var(--surface)' : 'var(--primary)'} fillOpacity={off || !showH2 ? 1 : 0.15 + 0.85 * (P.h2[v] / max2)} stroke={off ? 'var(--muted)' : 'var(--primary)'} strokeWidth={off ? 1.2 : 1.8} strokeDasharray={off ? '2.5 2' : undefined} />;
            })}
            <text x={X1} y={(Y1[N1 / 2 - 1] + Y1[N1 / 2]) / 2 + 5} fontSize={16} fill="var(--muted)" textAnchor="middle">⋮</text>
            <text x={X2} y={(Y2[N2 / 2 - 1] + Y2[N2 / 2]) / 2 + 5} fontSize={16} fill="var(--muted)" textAnchor="middle">⋮</text>
            <circle cx={XZ} cy={ZY} r={15} fill={showZ ? 'var(--primary)' : 'var(--surface)'} stroke="var(--primary)" strokeWidth={1.8} />
            <text x={XZ} y={ZY + 4.5} fontFamily={MONO} fontSize={13} fontWeight={500} textAnchor="middle" fill={showZ ? 'var(--on-primary)' : 'var(--primary)'}>z</text>
            {showZ && <text x={XZ} y={ZY + (ph ? 40 : 36)} fontFamily={MONO} fontSize={fs(11)} textAnchor="middle" fill="var(--text)">{P.z.toFixed(2)}</text>}
            {ph ? (
              <g fontFamily={MONO} fontSize={15} fill="var(--muted)" textAnchor="middle">
                <text x={VW / 2} y={496}>{N1}/64 and {N2}/32 units shown · dashed = dropped</text>
              </g>
            ) : (
              <g fontFamily={MONO} fontSize={10.5} fill="var(--muted)" textAnchor="middle">
                <text x={(X0 + X1) / 2} y={496}>W₁ 21×64 · 1,408 params</text>
                <text x={(X1 + X2) / 2 + 10} y={496}>W₂ 64×32 · 2,080</text>
                <text x={(X2 + XZ) / 2 + 6} y={496}>W₃ 32×1 · 33</text>
                <text x={VW / 2} y={514} fontSize={10}>showing the {N1} of 64 and {N2} of 32 units with the largest activations · dashed = dropped this pass</text>
              </g>
            )}
          </svg>
        </div>

        <div className="na-side">
          <div className={`na-panel${['cal'].includes(seg.phase) ? ' live' : ''}`}>
            <p className="na-eyebrow">Calibration</p>
            <p className="na-formula">p = σ(z / T + b)</p>
            <p className="na-mono small muted">T = {A.temperature.toFixed(3)} · b = {A.bias.toFixed(3)}</p>
            <p className="na-mono small">{at(seg, 'cal') && seg.phase !== 'out' ? <>pass {k + 1}: z = {P.z.toFixed(3)} → p = <b>{f3(P.p)}</b></> : <span className="muted">waiting for z…</span>}</p>
          </div>
          <div className={`na-panel${seg.phase === 'hist' || fast ? ' live' : ''}`}>
            <p className="na-eyebrow">Monte-Carlo dropout · pass {Math.min(n, done ? n : k + 1)} / {n}</p>
            <svg viewBox={`-4 -14 ${HW + 8} ${HH + 32}`} width="100%" role="img" aria-label={`Histogram of ${cnt} calibrated outputs`}>
              {cnt > 1 && <rect x={hx(mu - 2 * sd)} y={0} width={Math.max(1, hx(mu + 2 * sd) - hx(mu - 2 * sd))} height={HH} fill="var(--primary)" opacity={0.09} />}
              {cnt > 1 && <rect x={hx(A.threshold - A.tau * sd)} y={0} width={Math.max(1, hx(A.threshold + A.tau * sd) - hx(A.threshold - A.tau * sd))} height={HH} fill="var(--refer-bg)" stroke="var(--refer)" strokeDasharray="3 3" opacity={0.8} />}
              {counts.map((c, i) => c > 0 && <rect key={i} x={hx(lo + i * bw) + 1} y={HH - (c / ymax) * (HH - 4)} width={Math.max(1, hx(lo + (i + 1) * bw) - hx(lo + i * bw) - 2)} height={(c / ymax) * (HH - 4)} rx={1.5} fill="var(--primary)" />)}
              <line x1={0} x2={HW} y1={HH} y2={HH} stroke="var(--border)" />
              <line x1={hx(A.threshold)} x2={hx(A.threshold)} y1={-6} y2={HH} stroke="var(--high)" strokeWidth={1.5} strokeDasharray="4 3" />
              <text x={hx(A.threshold)} y={-8} fontFamily={MONO} fontSize={10} fill="var(--high)" textAnchor="middle">t</text>
              {cnt > 0 && <><line x1={hx(mu)} x2={hx(mu)} y1={-6} y2={HH} stroke="var(--text)" strokeWidth={1.5} /><text x={hx(mu) + 4} y={-4} fontFamily={MONO} fontSize={10} fill="var(--text)">μ</text></>}
              {([[lo, 'start'], [(lo + hi) / 2, 'middle'], [hi, 'end']] as const).map(([v, anc]) => <text key={anc} x={hx(v)} y={HH + 14} fontFamily={MONO} fontSize={9.5} fill="var(--muted)" textAnchor={anc}>{pct(v)}</text>)}
            </svg>
            <p className="na-mono small">μ = <b>{cnt ? f3(mu) : '—'}</b> · σ = <b>{cnt > 1 ? f3(sd) : '—'}</b></p>
          </div>
          <div className={`na-panel${done ? ' live' : ''}`}>
            <p className="na-eyebrow">Decision</p>
            <p className="na-formula">m = |μ − t| / σ {Number.isFinite(margin) && <span className="muted">= {margin.toFixed(2)}</span>}</p>
            <p className="na-mono small muted">t = {A.threshold.toFixed(2)} (F2) · τ = {A.tau.toFixed(2)} · refer if m &lt; τ</p>
            <div className="na-chips">
              {(['refer', 'higher', 'lower'] as const).map((d) => (
                <span key={d} className="na-chip" style={{ color: DEC[d][1], background: DEC[d][2], outline: decision === d ? `2px solid ${DEC[d][1]}` : 'none', opacity: decision && decision !== d ? 0.45 : 1 }}>{DEC[d][0]}</span>
              ))}
            </div>
            {done && decision && <p className="small" style={{ color: DEC[decision][1], fontWeight: 700 }}>{DEC[decision][0]} · risk {pct(mu)}, band {pct(Math.max(0, mu - 2 * sd))}–{pct(Math.min(1, mu + 2 * sd))}</p>}
          </div>
        </div>

        <p className="na-narration na-mono" aria-live="off">{narration}</p>

        <div className="na-controls">
          <button className="btn btn-primary na-play" onClick={() => { if (ended) setT(0); setPlaying(!playing); }} aria-label={playing ? 'Pause' : 'Play'}>{playing ? '❚❚ Pause' : ended ? '↻ Replay' : '▶ Play'}</button>
          <button className="btn btn-ghost" onClick={() => { setT(0); setPlaying(true); }}>Restart</button>
          <input className="na-scrub" type="range" min={0} max={total} step={0.01} value={t} onChange={(e) => { setPlaying(false); setT(Number(e.target.value)); }} aria-label="Playback position" />
          <div className="seg-speed" role="radiogroup" aria-label="Speed">
            {[0.5, 1, 2].map((s) => <button key={s} role="radio" aria-checked={speed === s} className={`opt${speed === s ? ' on' : ''}`} onClick={() => setSpeed(s)}>{s}×</button>)}
          </div>
        </div>
      </div>
    </div>
  );
}
