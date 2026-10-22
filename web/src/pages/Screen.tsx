import Wizard from '../components/Wizard';

export default function Screen() {
  return (
    <div className="stack-lg" style={{ maxWidth: 640, margin: '0 auto' }}>
      <div className="stack" style={{ gap: 8 }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)' }}>Screening</h1>
        <p className="muted">Four short steps, 21 questions from the CDC BRFSS 2015 survey the model was trained on.</p>
      </div>
      <Wizard />
    </div>
  );
}
