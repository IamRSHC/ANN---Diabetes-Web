import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../lib/store';
import { PHONE, useMedia } from '../lib/useMedia';
import { loadAnn, riskOf, type AnnModel } from '../lib/ann';
import { DECISION_TEXT, pct } from '../lib/format';
import { AGE_BANDS, EDUCATION, GENHLTH, INCOME, LABELS } from '../lib/questions';
import type { Answers, ModelScore } from '../lib/types';
import RiskGauge from '../components/RiskGauge';
import PassesChart from '../components/PassesChart';
import Bars from '../components/Bars';
import { DecisionBadge, decisionColor } from '../components/Decision';
import { Arrow, Printer } from '../components/Icons';

function answerText(k: keyof Answers, v: number): string {
  switch (k) {
    case 'Sex': return v === 1 ? 'Male' : 'Female';
    case 'Age': return AGE_BANDS[v - 1];
    case 'GenHlth': return GENHLTH[v - 1];
    case 'Education': return EDUCATION[v - 1];
    case 'Income': return INCOME[v - 1];
    case 'BMI': return String(v);
    case 'MentHlth': case 'PhysHlth': return `${v} days`;
    default: return v === 1 ? 'Yes' : 'No';
  }
}

function WhatIf({ base, baseRisk }: { base: Answers; baseRisk: number }) {
  const [m, setM] = useState<AnnModel | null>(null);
  const [row, setRow] = useState<Answers>(base);
  useEffect(() => { loadAnn().then(setM); }, []);
  useEffect(() => { setRow(base); }, [base]);
  const risk = useMemo(() => (m ? riskOf(row, m).risk : baseRisk), [m, row, baseRisk]);
  const diff = risk - baseRisk;
  const flip = (k: keyof Answers, healthy: number) => (
    <label className="row" style={{ gap: 10, fontSize: 14, cursor: 'pointer' }} key={k}>
      <input type="checkbox" checked={row[k] === healthy} onChange={(e) => setRow({ ...row, [k]: e.target.checked ? healthy : base[k] })} disabled={base[k] === healthy} style={{ accentColor: 'var(--primary)', width: 18, height: 18 }} />
      <span className={base[k] === healthy ? 'muted' : ''}>{{ HighBP: 'Blood pressure under control', HighChol: 'Cholesterol under control', PhysActivity: 'Physically active', Fruits: 'Fruit every day', Veggies: 'Vegetables every day' }[k as string]}{base[k] === healthy ? ' (already)' : ''}</span>
    </label>
  );
  return (
    <div className="card stack">
      <div className="stack" style={{ gap: 4 }}>
        <h3>What if?</h3>
        <p className="small muted">Change a few answers and the ANN re-scores you instantly in your browser. This shows what the model learned from survey data; it is not a treatment plan.</p>
      </div>
      <div className="field">
        <label htmlFor="wi-bmi">BMI</label>
        <div className="range">
          <input id="wi-bmi" type="range" min={12} max={Math.max(60, base.BMI)} step={1} value={row.BMI} onChange={(e) => setRow({ ...row, BMI: Number(e.target.value) })} />
          <span className="val num">{row.BMI}</span>
        </div>
      </div>
      <div className="field">
        <label>General health</label>
        <div className="options">
          {GENHLTH.map((g, i) => <button type="button" key={g} className={`opt${row.GenHlth === i + 1 ? ' on' : ''}`} onClick={() => setRow({ ...row, GenHlth: i + 1 })}>{g}</button>)}
        </div>
      </div>
      <div className="stack" style={{ gap: 8 }}>
        {flip('HighBP', 0)}{flip('HighChol', 0)}{flip('PhysActivity', 1)}{flip('Fruits', 1)}{flip('Veggies', 1)}
      </div>
      <div className="panel row" style={{ justifyContent: 'space-between' }}>
        <span>New estimated risk</span>
        <span className="num" style={{ fontWeight: 800, fontSize: 20 }}>
          {pct(risk)} <span className="small" style={{ color: Math.abs(diff) < 0.0005 ? 'var(--muted)' : diff < 0 ? 'var(--low)' : 'var(--high)', fontWeight: 700 }}>{Math.abs(diff) < 0.0005 ? '(no change)' : `(${diff < 0 ? '−' : '+'}${Math.abs(diff * 100).toFixed(1)} pts)`}</span>
        </span>
      </div>
      <button className="btn btn-ghost" onClick={() => setRow(base)}>Reset</button>
    </div>
  );
}

function ModelTable({ models }: { models: ModelScore[] }) {
  const agree = models.filter((m) => m.decision === 'higher').length;
  return (
    <div className="stack">
      <div className="table-wrap">
        <table className="t">
          <thead><tr><th>Model</th><th className="hide-sm">Family</th><th className="r">Your risk</th><th className="r hide-sm">Threshold</th><th>Decision</th><th className="r hide-sm">Test ROC-AUC</th><th className="r hide-sm">Test Brier</th></tr></thead>
          <tbody>
            {models.map((m) => (
              <tr key={m.name} className={m.family === 'Model 2' ? 'hl' : ''}>
                <td>{m.name === 'Proposed ANN' ? 'Proposed ANN (ours)' : m.name}</td>
                <td className="muted hide-sm">{m.family}</td>
                <td className="r" style={{ color: decisionColor(m.decision), fontWeight: 700 }}>{pct(m.risk)}</td>
                <td className="r hide-sm">{pct(m.threshold, 0)}</td>
                <td><DecisionBadge d={m.decision} small /></td>
                <td className="r hide-sm">{m.roc_auc.toFixed(3)}</td>
                <td className="r hide-sm">{m.brier.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="small muted">
        {agree} of {models.length} models place you above their own threshold. Raw percentages are not directly comparable: Logistic Regression, Random Forest and XGBoost were trained with class weighting and Gaussian NB is poorly calibrated, so their probabilities run high (test Brier 0.17 to 0.19) and their thresholds are higher to match. Only the decision column is comparable across models.
      </p>
    </div>
  );
}

export default function Results() {
  const { result, retryModels } = useStore();
  const phone = useMedia(PHONE);
  if (!result) {
    return (
      <div className="card stack" style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center', alignItems: 'center' }}>
        <h2>No result yet</h2>
        <p className="muted">Complete the four-step screening to see your calibrated risk and uncertainty.</p>
        <Link to="/screen" className="btn btn-primary">Start screening <Arrow /></Link>
      </div>
    );
  }
  const { ann, input, models, status } = result;
  const d = DECISION_TEXT[ann.decision];
  const drivers = ann.drivers.filter((x) => x.delta > 0.0005).slice(0, 6);

  return (
    <div className="stack-lg">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="stack" style={{ gap: 6 }}>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)' }}>Your screening result</h1>
          <p className="muted small">{answerText('Sex', input.Sex)} · {AGE_BANDS[input.Age - 1]} years · BMI {input.BMI} · {new Date().toLocaleDateString()}</p>
        </div>
        <div className="row no-print">
          <Link to="/screen" className="btn btn-ghost">Edit answers</Link>
          <button className="btn btn-ghost" onClick={() => window.print()}><Printer /> Print or save PDF</button>
        </div>
      </div>

      <div className="grid-2">
        <div className="card stack" style={{ gap: 20 }}>
          <div className="row" style={{ gap: 28 }}>
            <RiskGauge risk={ann.risk} threshold={ann.threshold} decision={ann.decision} />
            <div className="stack" style={{ gap: 10, flex: '1 1 200px' }}>
              <DecisionBadge d={ann.decision} />
              <div className="small"><span className="muted">Uncertainty band (±2σ): </span><b className="num">{pct(ann.band[0])} to {pct(ann.band[1])}</b></div>
              <div className="small"><span className="muted">Spread across passes (σ): </span><b className="num">{ann.sigma.toFixed(3)}</b></div>
              <div className="small"><span className="muted">Decision margin: </span><b className="num">{ann.margin.toFixed(2)}</b><span className="muted"> (refer below {ann.tau.toFixed(2)})</span></div>
            </div>
          </div>
          <div className={`callout ${ann.decision}`}><b>{d.title}.</b> {d.body}</div>
          <p className="small muted">Proposed ANN (Model 2). The ring's tick marks the {pct(ann.threshold, 0)} screening threshold, chosen to catch most diabetics (F2 score). The decision margin counts how many σ your risk sits from that threshold.</p>
        </div>

        <div className="card stack">
          <div className="stack" style={{ gap: 4 }}>
            <h3>How sure is the model?</h3>
            <p className="small muted">The network was run 50 times with different neurons switched off (Monte-Carlo dropout). A narrow cluster means a confident answer; a wide one that straddles the red line means "refer".</p>
          </div>
          <PassesChart passes={ann.passes} threshold={ann.threshold} risk={ann.risk} band={ann.band} />
        </div>
      </div>

      <div className="grid-2">
        <div className="card stack">
          <div className="stack" style={{ gap: 4 }}>
            <h3>What raises your estimate most</h3>
            <p className="small muted">Percentage points your risk would drop if this one answer were at its healthiest value, all else equal. Smoking and alcohol are left out: in this survey their learned effect is not causal.</p>
          </div>
          {drivers.length
            ? <Bars items={drivers.map((x) => ({ label: x.label, value: x.delta, display: `−${(x.delta * 100).toFixed(1)}` }))} />
            : <div className="panel small">None of your changeable answers raises the estimate noticeably.</div>}
        </div>
        <div className="no-print"><WhatIf base={input} baseRisk={ann.risk} /></div>
      </div>

      <div className="card stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div className="stack" style={{ gap: 4 }}>
            <h3>All nine models</h3>
            <p className="small muted">Model 2 is our ANN. Model 1 is the seven classical classifiers and the stacking ensemble, served live by the Python API.</p>
          </div>
          {status === 'api' && <span className="chip">Live from API</span>}
        </div>
        {status === 'loading' && <div className="panel row small"><span className="spinner" style={{ color: 'var(--primary)' }} /> Asking the API for Model 1… a free server can take up to a minute to wake up.</div>}
        {status === 'api' && models && <ModelTable models={models} />}
        {(status === 'offline' || status === 'browser-only') && (
          <div className="panel stack" style={{ gap: 10 }}>
            <span className="small"><b>Model 1 is unavailable right now.</b> {status === 'offline' ? 'The API did not answer.' : 'This deployment has no API configured.'} Your ANN result above is complete: it runs entirely in your browser.</span>
            {status === 'offline' && <button className="btn btn-ghost no-print" style={{ alignSelf: 'flex-start' }} onClick={retryModels}>Try the API again</button>}
            <Link to="/models" className="small">See every model's test-set performance</Link>
          </div>
        )}
      </div>

      <div className="card stack">
        <h3>Your answers</h3>
        {phone ? (
          <div className="answers">
            {(Object.keys(LABELS) as (keyof Answers)[]).map((k) => (
              <div key={k}><span className="muted small">{LABELS[k]}</span><b>{answerText(k, input[k])}</b></div>
            ))}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="t">
              <tbody>
                {(Object.keys(LABELS) as (keyof Answers)[]).reduce<(keyof Answers)[][]>((rows, k, i) => { if (i % 3 === 0) rows.push([]); rows[rows.length - 1].push(k); return rows; }, []).map((ks) => (
                  <tr key={ks.join()}>{ks.map((k) => <td key={k}><span className="muted small">{LABELS[k]}</span><br /><b>{answerText(k, input[k])}</b></td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="small muted">This is a screening aid built on self-reported BRFSS 2015 survey data. It is not a diagnosis. Only a blood test (HbA1c or fasting glucose) can confirm diabetes.</p>
      </div>
    </div>
  );
}
