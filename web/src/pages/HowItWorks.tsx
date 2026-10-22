import { Link } from 'react-router-dom';
import meta from '../data/meta.json';
import { Arrow } from '../components/Icons';
import ArchDiagram from '../components/ArchDiagram';

const a = meta.ann;

export default function HowItWorks() {
  return (
    <div className="stack-lg" style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div className="stack" style={{ gap: 8 }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)' }}>How it works</h1>
        <p className="muted">Two model families trained on the same data with the same leakage-free protocol. Model 1 is seven established classifiers and a stacking ensemble; Model 2 is our neural network, written from scratch in NumPy.</p>
      </div>

      <div className="card stack">
        <h3>The proposed network (Model 2)</h3>
        <ArchDiagram />
        <p className="small muted">The example is a real prediction from the trained model (female, 50-54, BMI 36, high blood pressure and cholesterol, difficulty walking). Forward pass, backpropagation, dropout and the Adam optimiser were written by hand in NumPy and checked with a numerical gradient check. The same network runs in your browser in TypeScript, using the same random-number generator as NumPy, so it gives exactly the same result as the Python model.</p>
      </div>

      <div className="grid-2">
        {[
          ['Focal loss', `Only 14% of respondents have diabetes, so plain cross-entropy is dominated by easy negatives. Focal loss (α = ${a.focal_alpha}, γ = ${a.focal_gamma}) down-weights well-classified examples and up-weights the minority class.`],
          ['Calibration with a bias term', 'Focal loss and class weighting inflate probabilities (Brier about 0.18). A temperature T and a bias b are fitted on validation data so that a predicted 30% means about 30 in 100. The Brier score returns to 0.097.'],
          ['Monte-Carlo dropout', `Running the network ${a.mc_passes} times with random neurons switched off gives ${a.mc_passes} slightly different answers. Their spread σ measures how sure the model is about you.`],
          ['Decision-margin referral', `The margin |μ − t| / σ asks: could your answer flip within the model's own uncertainty? τ = ${a.tau.toFixed(2)} is the 10th percentile on validation data, so about 10% of people are referred. On the test set those referrals are wrong 49.9% of the time, against 29.1% for the rest.`],
        ].map(([t, d]) => (
          <div className="card card-tight stack" key={t} style={{ gap: 8 }}><h3>{t}</h3><p className="small muted">{d}</p></div>
        ))}
      </div>

      <div className="card stack">
        <h3>Model 1: the established classifiers</h3>
        <p className="small muted">Logistic Regression, K-Nearest Neighbours, SVM (RBF, Platt-scaled), Random Forest, XGBoost, Gaussian Naive Bayes and a scikit-learn MLP, tuned with group-aware cross-validation. A stacking ensemble combines six of them with a logistic-regression meta-learner. They run on the Python API; the website shows them on the results page when the API is online.</p>
      </div>

      <div className="card stack">
        <h3>Data and evaluation</h3>
        <ul className="small muted" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
          <li>CDC BRFSS 2015 Diabetes Health Indicators: {meta.dataset.respondents.toLocaleString()} respondents, {meta.dataset.features} self-reported features, {(meta.dataset.prevalence * 100).toFixed(2)}% with diabetes or prediabetes.</li>
          <li>Group-aware stratified split (seed 42): identical answer profiles never appear in both training and test data. Test set: {meta.dataset.test_size.toLocaleString()} respondents at the real prevalence.</li>
          <li>All preprocessing, tuning, thresholds and calibration were fitted on training or validation data only.</li>
          <li>Thresholds maximise F2 on validation data, because missing a diabetic costs more than an extra blood test.</li>
        </ul>
      </div>

      <div className="card stack">
        <h3>Limitations</h3>
        <ul className="small muted" style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
          <li>The answers are self-reported and the survey is cross-sectional, so the model learns associations, not causes. For example, smokers and drinkers in this survey have slightly lower predicted risk; that is not advice to smoke or drink, and those factors are hidden from the driver chart.</li>
          <li>Recall is low for 18 to 39 year olds, where diabetes is rare.</li>
          <li>Diabetes and prediabetes are combined into one class, as in the source dataset.</li>
          <li>This is a screening aid for a course project, not a medical device. Only a blood test can diagnose diabetes.</li>
        </ul>
      </div>

      <div className="row"><Link to="/screen" className="btn btn-primary">Start screening <Arrow /></Link><Link to="/models" className="btn btn-ghost">Model performance</Link></div>
    </div>
  );
}
