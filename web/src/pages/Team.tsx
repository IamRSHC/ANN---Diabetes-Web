const MEMBERS = [
  { name: 'Hareecharan R S', reg: 'RA2411026050331', ini: 'HR' },
  { name: 'V Shakthi Balan', reg: 'RA2411026050334', ini: 'SB' },
  { name: 'Manoranjan U S', reg: 'RA2411026050305', ini: 'MU' },
];

export default function Team() {
  return (
    <div className="stack-lg" style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div className="stack" style={{ gap: 8 }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)' }}>Team</h1>
        <p className="muted">Calibrated and Uncertainty-Aware Diabetes Risk Prediction Using Artificial Neural Networks.</p>
      </div>
      <div className="grid-3">
        {MEMBERS.map((m) => (
          <div className="card team-card" key={m.reg}>
            <span className="avatar" aria-hidden="true">{m.ini}</span>
            <div className="team-text"><h3>{m.name}</h3><span className="small muted num">{m.reg}</span></div>
          </div>
        ))}
      </div>
      <div className="card stack" style={{ gap: 10 }}>
        <h3>Course</h3>
        <p className="small muted">21CSE326T Artificial Neural Networks · B.Tech CSE (AI &amp; ML), Semester V, 2026-27</p>
        <p className="small muted">SRM Institute of Science and Technology, Tiruchirappalli</p>
      </div>
    </div>
  );
}
