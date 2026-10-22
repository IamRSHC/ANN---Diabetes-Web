// Histogram of the 50 Monte-Carlo dropout passes, with the screening threshold, the mean and the ±2σ band.
export default function PassesChart({ passes, threshold, risk, band }: { passes: number[]; threshold: number; risk: number; band: [number, number] }) {
  const W = 560, H = 210, L = 36, R = 30, T = 14, B = 34;
  const lo0 = Math.min(...passes, threshold, band[0]), hi0 = Math.max(...passes, threshold, band[1]);
  const pad = Math.max((hi0 - lo0) * 0.12, 0.01);
  const lo = Math.max(0, lo0 - pad), hi = Math.min(1, hi0 + pad);
  const nb = 16, bw = (hi - lo) / nb;
  const counts = Array.from({ length: nb }, () => 0);
  passes.forEach((p) => { counts[Math.min(nb - 1, Math.floor((p - lo) / bw))]++; });
  const maxC = Math.max(...counts, 1);
  const x = (v: number) => L + ((v - lo) / (hi - lo)) * (W - L - R);
  const y = (cnt: number) => H - B - (cnt / maxC) * (H - B - T);
  const ticks = Array.from({ length: 5 }, (_, i) => lo + (i * (hi - lo)) / 4);
  return (
    <div className="stack" style={{ gap: 8 }}>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Distribution of the 50 dropout passes">
        <rect x={x(band[0])} y={T} width={Math.max(1, x(band[1]) - x(band[0]))} height={H - B - T} fill="var(--primary)" opacity="0.09" />
        {[0.25, 0.5, 0.75, 1].map((f) => <line key={f} className="grid" x1={L} x2={W - R} y1={y(maxC * f)} y2={y(maxC * f)} />)}
        {counts.map((cnt, i) => cnt > 0 && (
          <rect key={i} x={x(lo + i * bw) + 1.5} y={y(cnt)} width={Math.max(1, x(lo + (i + 1) * bw) - x(lo + i * bw) - 3)} height={H - B - y(cnt)} rx="3" fill="var(--primary)" opacity="0.85" />
        ))}
        <line className="axis" x1={L} x2={W - R} y1={H - B} y2={H - B} />
        {ticks.map((t) => <text key={t} x={x(t)} y={H - B + 18} textAnchor="middle">{(t * 100).toFixed(1)}%</text>)}
        <text x={L - 8} y={T + 8} textAnchor="end">{maxC}</text>
        <text x={L - 8} y={H - B} textAnchor="end">0</text>
        <line x1={x(threshold)} x2={x(threshold)} y1={T - 4} y2={H - B} stroke="var(--high)" strokeWidth="2" strokeDasharray="5 4" />
        <line x1={x(risk)} x2={x(risk)} y1={T - 4} y2={H - B} stroke="var(--text)" strokeWidth="2" />
      </svg>
      <div className="legend">
        <span><i style={{ background: 'var(--primary)' }} />Dropout passes (50)</span>
        <span><i style={{ background: 'var(--text)' }} />Mean risk {(risk * 100).toFixed(1)}%</span>
        <span><i style={{ background: 'var(--high)' }} />Screening threshold {(threshold * 100).toFixed(0)}%</span>
        <span><i style={{ background: 'var(--primary)', opacity: 0.25 }} />±2σ band</span>
      </div>
    </div>
  );
}
