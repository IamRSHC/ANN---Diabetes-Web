import type { Decision } from '../lib/types';
import { decisionColor } from './Decision';

// Donut gauge: the calibrated risk as an arc, with a tick at the screening threshold.
export default function RiskGauge({ risk, threshold, decision, size = 180 }: { risk: number; threshold: number; decision: Decision; size?: number }) {
  const r = 70, c = 2 * Math.PI * r, sw = 16;
  const tick = threshold * 2 * Math.PI - Math.PI / 2;
  const tx1 = 90 + (r - sw / 2 - 4) * Math.cos(tick), ty1 = 90 + (r - sw / 2 - 4) * Math.sin(tick);
  const tx2 = 90 + (r + sw / 2 + 4) * Math.cos(tick), ty2 = 90 + (r + sw / 2 + 4) * Math.sin(tick);
  return (
    <svg width={size} height={size} viewBox="0 0 180 180" role="img" aria-label={`Estimated risk ${(risk * 100).toFixed(1)} percent`}>
      <circle cx="90" cy="90" r={r} fill="none" stroke="var(--track)" strokeWidth={sw} />
      <circle cx="90" cy="90" r={r} fill="none" stroke={decisionColor(decision)} strokeWidth={sw} strokeLinecap="round"
        strokeDasharray={`${Math.max(risk * c, 0.5)} ${c}`} transform="rotate(-90 90 90)" style={{ transition: 'stroke-dasharray .5s ease' }} />
      <line x1={tx1} y1={ty1} x2={tx2} y2={ty2} stroke="var(--text)" strokeWidth="2.5" />
      <text x="90" y="88" textAnchor="middle" fontFamily="var(--display)" fontWeight="800" fontSize="32" fill="var(--text)">{(risk * 100).toFixed(1)}%</text>
      <text x="90" y="110" textAnchor="middle" fontSize="12" fill="var(--muted)">calibrated risk</text>
    </svg>
  );
}
