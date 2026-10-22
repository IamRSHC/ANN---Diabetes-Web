import meta from '../data/meta.json';
import Bars from '../components/Bars';

const R = meta.results;
const ORDER = ['Proposed ANN', 'Stacking Ensemble', 'XGBoost', 'MLP (sklearn)', 'Random Forest', 'SVM (RBF)', 'Logistic Regression', 'KNN', 'Gaussian NB'];
const rows = ORDER.map((m) => R.find((r) => r.model === m)!).filter(Boolean);
type Row = (typeof R)[number];
const COLS: { k: keyof Row; label: string; low?: boolean; sm?: boolean }[] = [
  { k: 'ROC-AUC', label: 'ROC-AUC' }, { k: 'PR-AUC', label: 'PR-AUC', sm: false }, { k: 'Recall', label: 'Recall' }, { k: 'Specificity', label: 'Specificity', sm: false },
  { k: 'Precision', label: 'Precision', sm: false }, { k: 'F2', label: 'F2', sm: false }, { k: 'Brier', label: 'Brier', low: true }, { k: 'Threshold', label: 'Threshold', sm: false },
];
const best = (k: keyof Row, low?: boolean) => { const v = rows.map((r) => Number(r[k])); return low ? Math.min(...v) : Math.max(...v); };
const unc = meta.uncertainty;
const rules = meta.abstention_rules;
const ann = meta.ann;

export default function Dashboard() {
  return (
    <div className="stack-lg">
      <div className="stack" style={{ gap: 8 }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)' }}>Model performance</h1>
        <p className="muted">Every number on this page comes from the held-out test set: {meta.dataset.test_size.toLocaleString()} respondents the models never saw while training or tuning, split so that identical answer profiles never appear on both sides.</p>
      </div>

      <div className="grid-4">
        {[
          [meta.dataset.respondents.toLocaleString(), 'BRFSS 2015 respondents'],
          [String(meta.dataset.features), 'Survey features'],
          [`${(meta.dataset.prevalence * 100).toFixed(1)}%`, 'Have diabetes or prediabetes'],
          ['9', 'Models compared'],
        ].map(([v, l]) => (
          <div className="card card-tight stat" key={l}><span className="v num">{v}</span><span className="l">{l}</span></div>
        ))}
      </div>

      <div className="card stack">
        <h3>Test-set results</h3>
        <div className="table-wrap">
          <table className="t">
            <thead><tr><th>Model</th>{COLS.map((c) => <th key={c.label} className={`r${c.sm === false ? ' hide-sm' : ''}`}>{c.label}</th>)}</tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.model} className={r.model === 'Proposed ANN' ? 'hl' : ''}>
                  <td>{r.model === 'Proposed ANN' ? 'Proposed ANN (Model 2)' : r.model}</td>
                  {COLS.map((c) => {
                    const v = Number(r[c.k]);
                    const isBest = c.k !== 'Threshold' && c.k !== 'Specificity' && c.k !== 'Precision' && v === best(c.k, c.low);
                    return <td key={c.label} className={`r${isBest ? ' best' : ''}${c.sm === false ? ' hide-sm' : ''}`}>{c.k === 'Threshold' ? v.toFixed(2) : v.toFixed(3)}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small muted">Bold = best in column. Each threshold was chosen on the validation split to maximise F2, which weights recall twice as much as precision: missing a diabetic costs more than an extra blood test. The ANN, stacking ensemble and XGBoost are within 0.002 ROC-AUC of each other; the ANN's advantage is a calibrated probability (low Brier) plus an uncertainty estimate the others do not give.</p>
      </div>

      <div className="grid-2">
        <div className="card stack">
          <h3>Ranking quality (PR-AUC)</h3>
          <p className="small muted">Area under the precision-recall curve. A random model would score {meta.dataset.prevalence.toFixed(2)}.</p>
          <Bars items={rows.map((r) => ({ label: r.model, value: r['PR-AUC'], display: r['PR-AUC'].toFixed(3), strong: r.model === 'Proposed ANN', color: r.model === 'Proposed ANN' ? 'var(--accent)' : undefined }))} max={0.5} />
        </div>
        <div className="card stack">
          <h3>Calibration (Brier score, lower is better)</h3>
          <p className="small muted">Mean squared error of the predicted probability. Class-weighted models score worse because their probabilities are inflated.</p>
          <Bars items={rows.map((r) => ({ label: r.model, value: r.Brier, display: r.Brier.toFixed(3), strong: r.model === 'Proposed ANN', color: r.Brier > 0.15 ? 'var(--high)' : r.model === 'Proposed ANN' ? 'var(--accent)' : undefined }))} max={0.2} />
        </div>
      </div>

      <div className="card stack">
        <h3>Ablation: what each component of the ANN adds</h3>
        <div className="table-wrap">
          <table className="t">
            <thead><tr><th>Variant</th><th className="r">PR-AUC</th><th className="r">ROC-AUC</th><th className="r">Brier</th><th className="r hide-sm">Recall @ F2</th><th className="r hide-sm">F2</th></tr></thead>
            <tbody>
              {meta.ablation.map((a, i) => (
                <tr key={a.variant} className={i === meta.ablation.length - 1 ? 'hl' : ''}>
                  <td>{a.variant}</td><td className="r">{a['PR-AUC'].toFixed(4)}</td><td className="r">{a['ROC-AUC'].toFixed(4)}</td>
                  <td className="r">{a.Brier.toFixed(4)}</td><td className="r hide-sm">{a['Recall@F2'].toFixed(4)}</td><td className="r hide-sm">{a.F2.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small muted">Measured on the validation split. Ranking (PR-AUC, ROC-AUC) barely moves between variants. Class weighting and focal loss push the Brier score up to about 0.18; calibration brings it back to 0.097 while keeping the recall. MC dropout's contribution is the uncertainty estimate used for referral, not a higher score.</p>
      </div>

      <div className="grid-2">
        <div className="card stack">
          <h3>Does "refer to doctor" pick the right cases?</h3>
          <Bars items={unc.map((u) => ({ label: u.group, value: u['error rate'], display: `${(u['error rate'] * 100).toFixed(1)}%`, color: u.group.startsWith('Referred') ? 'var(--refer)' : 'var(--primary)' }))} max={0.6} />
          <p className="small muted">Error rate on the test set. The {unc[1].cases.toLocaleString()} referred cases ({(unc[1].share * 100).toFixed(1)}%) are wrong {(unc[1]['error rate'] * 100).toFixed(1)}% of the time, close to a coin flip, against {(unc[0]['error rate'] * 100).toFixed(1)}% for the cases the model decides. Referral rule: |risk − {ann.threshold.toFixed(2)}| / σ &lt; τ = {ann.tau.toFixed(2)}.</p>
        </div>
        <div className="card stack">
          <h3>Margin rule vs a naive rule</h3>
          <div className="table-wrap">
            <table className="t">
              <thead><tr><th>Rule</th><th className="r">Referred</th><th className="r">Error (referred)</th><th className="r">Error (accepted)</th></tr></thead>
              <tbody>
                {rules.map((r) => (
                  <tr key={r.group}><td style={{ whiteSpace: 'normal' }}>{r.group}</td><td className="r">{r.referred.toLocaleString()}</td><td className="r">{(r['error rate referred'] * 100).toFixed(1)}%</td><td className="r">{(r['error rate accepted'] * 100).toFixed(1)}%</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="small muted">Both rules pick out hard cases. On this test set the naive rule (refer the 10% with the largest σ) does slightly better. In the first, uncalibrated run the naive rule referred easier cases, which is why the margin rule was adopted; choosing between them on validation data alone is left for future work.</p>
        </div>
      </div>

      <div className="stack-lg">
        <div className="card stack">
          <h3>Fairness check (ANN, test set)</h3>
          <div className="table-wrap">
            <table className="t">
              <thead><tr><th>Group</th><th className="r hide-sm">n</th><th className="r">Diabetes rate</th><th className="r">Recall</th><th className="r">Specificity</th></tr></thead>
              <tbody>
                {meta.bias.map((b) => (
                  <tr key={b.attribute + b.group}><td>{b.attribute}: {b.group}</td><td className="r hide-sm">{b.n.toLocaleString()}</td><td className="r">{(b['diabetes rate'] * 100).toFixed(1)}%</td><td className="r">{b.recall.toFixed(3)}</td><td className="r">{b.specificity.toFixed(3)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="small muted">Recall is lowest for 18 to 39 year olds (0.45), where diabetes is rare (2.8%). A single threshold treats young people more leniently; this is a known limitation.</p>
        </div>
        <div className="card stack">
          <h3>What the ANN relies on (SHAP)</h3>
          <p className="small muted">Mean absolute SHAP value per feature on test respondents.</p>
          <Bars items={meta.shap_ann.slice(0, 10).map((s) => ({ label: (s.feature in LABELS_SHORT ? LABELS_SHORT[s.feature] : s.feature), value: s.importance, display: s.importance.toFixed(3) }))} />
        </div>
      </div>
    </div>
  );
}

const LABELS_SHORT: Record<string, string> = {
  GenHlth: 'General health', BMI: 'BMI', HighBP: 'High blood pressure', HighChol: 'High cholesterol', Age: 'Age', Sex: 'Sex', Income: 'Income',
  HeartDiseaseorAttack: 'Heart disease', DiffWalk: 'Difficulty walking', HvyAlcoholConsump: 'Heavy drinking', Education: 'Education',
};
