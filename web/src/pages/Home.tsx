import type React from 'react';
import { Link } from 'react-router-dom';
import meta from '../data/meta.json';
import Wizard from '../components/Wizard';

const ann = meta.results.find((r) => r.model === 'Proposed ANN')!;

// When the screening card sits below the text (phones, small tablets), scroll to it instead of opening /screen.
function toCard(e: React.MouseEvent) {
  const card = document.getElementById('screening');
  if (!card || !window.matchMedia('(max-width: 960px)').matches) return;
  e.preventDefault();
  card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function Home() {
  return (
    <section className="landing">
      <div className="landing-copy">
        <h1>Know your diabetes risk in two minutes.</h1>
        <p className="lead">Answer 21 everyday health questions. Get a calibrated risk, an honest uncertainty band, and a clear next step - including when to see a doctor.</p>
        <div className="row">
          <Link to="/screen" className="btn btn-primary" onClick={toCard}>Start screening</Link>
          <Link to="/how-it-works" className="btn btn-ghost">See how it works</Link>
        </div>
        <div className="landing-stats">
          <div><b className="num">{ann['ROC-AUC'].toFixed(3)}</b><span>ROC-AUC on {meta.dataset.test_size.toLocaleString()} unseen people</span></div>
          <div><b className="num">{(ann.Recall * 100).toFixed(1)}%</b><span>of diabetics detected</span></div>
          <div><b className="num">{ann.Brier.toFixed(3)}</b><span>Brier score (calibrated)</span></div>
        </div>
      </div>
      <Wizard />
    </section>
  );
}
