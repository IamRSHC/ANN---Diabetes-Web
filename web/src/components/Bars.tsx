// Horizontal bar list used for drivers, feature importance and metric comparisons.
export interface Bar { label: string; value: number; display?: string; color?: string; strong?: boolean }
export default function Bars({ items, max }: { items: Bar[]; max?: number }) {
  const m = max ?? Math.max(...items.map((i) => i.value), 1e-9);
  return (
    <div className="stack" style={{ gap: 10 }}>
      {items.map((b) => (
        <div className="bar-row" key={b.label}>
          <span style={{ fontWeight: b.strong ? 700 : 500 }}>{b.label}</span>
          <div className="bar-track"><div className="bar-fill" style={{ width: `${Math.max(1.5, (b.value / m) * 100)}%`, background: b.color ?? 'var(--primary)' }} /></div>
          <span className="num" style={{ textAlign: 'right', fontWeight: 600 }}>{b.display ?? b.value.toFixed(3)}</span>
        </div>
      ))}
    </div>
  );
}
