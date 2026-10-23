import { Link } from 'react-router-dom';
import meta from '../data/meta.json';
import { Arrow } from '../components/Icons';
import ArchDiagram from '../components/ArchDiagram';
import { PHONE, useMedia } from '../lib/useMedia';

const a = meta.ann;
const d = meta.dataset;

const NOVELTY = [
  ['01', 'Focal loss', `Only 14% of respondents have diabetes, so plain cross-entropy is dominated by easy negatives. Focal loss (α = ${a.focal_alpha}, γ = ${a.focal_gamma}) down-weights well-classified examples and up-weights the minority class.`],
  ['02', 'Calibration with a bias term', 'Focal loss and class weighting inflate probabilities (Brier about 0.18). A temperature T and a bias b are fitted on validation data so that a predicted 30% means about 30 in 100. The Brier score returns to 0.097.'],
  ['03', 'Monte-Carlo dropout', `Running the network ${a.mc_passes} times with random neurons switched off gives ${a.mc_passes} slightly different answers. Their spread σ measures how sure the model is about you.`],
  ['04', 'Decision-margin referral', `The margin |μ − t| / σ asks: could your answer flip within the model's own uncertainty? τ = ${a.tau.toFixed(2)} is the 10th percentile on validation data, so about 10% of people are referred. On the test set those referrals are wrong 49.9% of the time, against 29.1% for the rest.`],
];

const DATA = [
  `CDC BRFSS 2015 Diabetes Health Indicators: ${d.respondents.toLocaleString()} respondents, ${d.features} self-reported features, ${(d.prevalence * 100).toFixed(2)}% with diabetes or prediabetes.`,
  `Group-aware stratified split (seed 42): identical answer profiles never appear in both training and test data. Test set: ${d.test_size.toLocaleString()} respondents at the real prevalence.`,
  'All preprocessing, tuning, thresholds and calibration were fitted on training or validation data only.',
  'Thresholds maximise F2 on validation data, because missing a diabetic costs more than an extra blood test.',
];

const LIMITS = [
  'The answers are self-reported and the survey is cross-sectional, so the model learns associations, not causes. For example, smokers and drinkers in this survey have slightly lower predicted risk; that is not advice to smoke or drink, and those factors are hidden from the driver chart.',
  'Recall is low for 18 to 39 year olds, where diabetes is rare.',
  'Diabetes and prediabetes are combined into one class, as in the source dataset.',
  'This is a screening aid for a course project, not a medical device. Only a blood test can diagnose diabetes.',
];

const CAPTION = 'The example is a real prediction from the trained model (female, 50-54, BMI 36, high blood pressure and cholesterol, difficulty walking). Forward pass, backpropagation, dropout and the Adam optimiser were written by hand in NumPy and checked with a numerical gradient check. The same network runs in your browser in TypeScript, using the same random-number generator as NumPy, so it gives exactly the same result as the Python model.';
const MODEL1 = 'Logistic Regression, K-Nearest Neighbours, SVM (RBF, Platt-scaled), Random Forest, XGBoost, Gaussian Naive Bayes and a scikit-learn MLP, tuned with group-aware cross-validation. A stacking ensemble combines six of them with a logistic-regression meta-learner. They run on the Python API; the website shows them on the results page when the API is online.';

const List = ({ items }: { items: string[] }) => <ul className="hw-list">{items.map((x) => <li key={x}>{x}</li>)}</ul>;

// Phones keep the boxed layout (one card per topic); desktop and tablet use the article layout below.
function PhoneLayout() {
  const ul = { margin: 0, paddingLeft: 18, display: 'grid', gap: 6 } as const;
  return (
    <div className="stack-lg">
      <div className="stack" style={{ gap: 8 }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)' }}>How it works</h1>
        <p className="muted">Two model families trained on the same data with the same leakage-free protocol. Model 1 is seven established classifiers and a stacking ensemble; Model 2 is our neural network, written from scratch in NumPy.</p>
      </div>
      <div className="card stack">
        <h3>The proposed network (Model 2)</h3>
        <ArchDiagram />
        <p className="small muted">{CAPTION}</p>
        <div className="na-band"><Link to="/how-it-works/network" className="na-link">▶ Watch the network run: an animated walkthrough of one prediction, pass by pass</Link></div>
      </div>
      <div className="grid-2">
        {NOVELTY.map(([n, t, x]) => <div className="card card-tight stack" key={n} style={{ gap: 8 }}><h3>{t}</h3><p className="small muted">{x}</p></div>)}
      </div>
      <div className="card stack"><h3>Model 1: the established classifiers</h3><p className="small muted">{MODEL1}</p></div>
      <div className="card stack"><h3>Data and evaluation</h3><ul className="small muted" style={ul}>{DATA.map((x) => <li key={x}>{x}</li>)}</ul></div>
      <div className="card stack"><h3>Limitations</h3><ul className="small muted" style={ul}>{LIMITS.map((x) => <li key={x}>{x}</li>)}</ul></div>
      <div className="row"><Link to="/screen" className="btn btn-primary">Start screening <Arrow /></Link><Link to="/models" className="btn btn-ghost">Model performance</Link></div>
    </div>
  );
}

export default function HowItWorks() {
  const phone = useMedia(PHONE);
  if (phone) return <PhoneLayout />;
  return (
    <div className="hw-page">
      <div className="stack" style={{ gap: 8 }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)' }}>How it works</h1>
        <p className="muted">Two model families trained on the same data with the same leakage-free protocol. Model 1 is seven established classifiers and a stacking ensemble; Model 2 is our neural network, written from scratch in NumPy.</p>
      </div>

      <figure className="hw-figure">
        <div className="card">
          <h3 style={{ marginBottom: 14 }}>The proposed network (Model 2)</h3>
          <ArchDiagram />
        </div>
        <figcaption className="small muted">{CAPTION}</figcaption>
        <div className="na-band"><Link to="/how-it-works/network" className="na-link">▶ Watch the network run: an animated walkthrough of one prediction, pass by pass</Link></div>
      </figure>

      <section>
        <p className="hw-eyebrow">What makes Model 2 different</p>
        <div className="hw-four">
          {NOVELTY.map(([n, t, x]) => (
            <div key={n}><span className="hw-num">{n}</span><h3>{t}</h3><p className="muted small">{x}</p></div>
          ))}
        </div>
      </section>

      <section className="hw-rows">
        <div className="hw-row">
          <div><p className="hw-eyebrow">Baselines</p><h3>Model 1: the established classifiers</h3></div>
          <p className="muted small">{MODEL1}</p>
        </div>
        <div className="hw-row">
          <div><p className="hw-eyebrow">Protocol</p><h3>Data and evaluation</h3></div>
          <List items={DATA} />
        </div>
        <div className="hw-row">
          <div><p className="hw-eyebrow">Honest notes</p><h3>Limitations</h3></div>
          <List items={LIMITS} />
        </div>
      </section>

      <div className="row"><Link to="/screen" className="btn btn-primary">Start screening <Arrow /></Link><Link to="/models" className="btn btn-ghost">Model performance</Link></div>
    </div>
  );
}
