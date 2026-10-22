// The four-step screening form. Used as the card on the landing page and on the Screening page.
import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../lib/store';
import { ACCESS, AGE_BANDS, BMI_MAX, BMI_MIN, EDUCATION, GENHLTH, HISTORY, INCOME, LIFESTYLE, bmiOf } from '../lib/questions';
import type { Answers } from '../lib/types';

const STEPS = ['About you', 'Health history', 'Lifestyle', 'Wellbeing and access'];

function Row({ label, children, htmlFor }: { label: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="qrow">
      {htmlFor ? <label htmlFor={htmlFor} className="qlabel">{label}</label> : <span className="qlabel">{label}</span>}
      <div className="qctl">{children}</div>
    </div>
  );
}

function Choice({ label, options, value, onChange }: { label: string; options: [string, number][]; value: number; onChange: (v: number) => void }) {
  return (
    <Row label={label}>
      <div className="yn" role="radiogroup" aria-label={label}>
        {options.map(([text, v]) => (
          <button type="button" key={text} role="radio" aria-checked={value === v} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>{text}</button>
        ))}
      </div>
    </Row>
  );
}

const NO_YES: [string, number][] = [['No', 0], ['Yes', 1]];

export default function Wizard() {
  const { answers, setAnswers, height, setHeight, weight, setWeight, run } = useStore();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [hStr, setHStr] = useState(Number.isFinite(height) ? String(height) : '');
  const [wStr, setWStr] = useState(Number.isFinite(weight) ? String(weight) : '');
  const navigate = useNavigate();
  const set = (k: keyof Answers) => (v: number) => setAnswers({ ...answers, [k]: v });

  const bmi = useMemo(() => bmiOf(height, weight), [height, weight]);
  const heightOk = height >= 100 && height <= 250;
  const weightOk = weight >= 25 && weight <= 300;
  const bmiOk = heightOk && weightOk && Number.isFinite(bmi) && bmi >= BMI_MIN && bmi <= BMI_MAX;
  const last = step === STEPS.length - 1;

  async function next() {
    if (!last) { setStep(step + 1); return; }
    setBusy(true);
    const row: Answers = { ...answers, BMI: Math.round(bmi) };
    setAnswers(row);
    await run(row);
    setBusy(false);
    navigate('/results');
  }

  const select = (id: string, k: keyof Answers, opts: string[], suffix = '') => (
    <select id={id} className="select sm" value={answers[k]} onChange={(e) => set(k)(Number(e.target.value))}>
      {opts.map((o, i) => <option key={o} value={i + 1}>{o}{suffix}</option>)}
    </select>
  );
  const days = (k: 'MentHlth' | 'PhysHlth') => (
    <div className="days">
      <input type="range" min={0} max={30} value={answers[k]} onChange={(e) => set(k)(Number(e.target.value))} aria-label={k === 'MentHlth' ? 'Days of poor mental health' : 'Days of poor physical health'} />
      <span className="num">{answers[k]}</span>
    </div>
  );

  return (
    <div className="wizard card">
      <div className="wz-head">
        <span>Step {step + 1} of {STEPS.length} · {STEPS[step]}</span>
        <span className="num">{((step + 1) / STEPS.length) * 100}%</span>
      </div>
      <div className="wz-bar"><div style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></div>

      <div className="wz-body">
        {step === 0 && (
          <>
            <Choice label="Sex" options={[['Female', 0], ['Male', 1]]} value={answers.Sex} onChange={set('Sex')} />
            <Row label="Age" htmlFor="age">{select('age', 'Age', AGE_BANDS, ' years')}</Row>
            <Row label="Height and weight">
              <div className="hw">
                <input aria-label="Height in cm" className={`input sm${heightOk ? '' : ' bad'}`} type="number" inputMode="decimal" value={hStr} onChange={(e) => { setHStr(e.target.value); setHeight(parseFloat(e.target.value)); }} /><span>cm</span>
                <input aria-label="Weight in kg" className={`input sm${weightOk ? '' : ' bad'}`} type="number" inputMode="decimal" value={wStr} onChange={(e) => { setWStr(e.target.value); setWeight(parseFloat(e.target.value)); }} /><span>kg</span>
              </div>
            </Row>
            <p className={`wz-note${bmiOk ? '' : ' err'}`}>
              {!heightOk ? 'Enter a height between 100 and 250 cm.'
                : !weightOk ? 'Enter a weight between 25 and 300 kg.'
                : bmiOk ? <>BMI {bmi.toFixed(1)}</>
                : <>A BMI of {bmi.toFixed(1)} is outside the survey range ({BMI_MIN} to {BMI_MAX}). Please check your height and weight.</>}
            </p>
            <Row label="Education" htmlFor="edu">{select('edu', 'Education', EDUCATION)}</Row>
            <Row label="Household income" htmlFor="inc">{select('inc', 'Income', INCOME)}</Row>
          </>
        )}
        {step === 1 && (
          <>
            <Row label="Your health in general" htmlFor="gen">{select('gen', 'GenHlth', GENHLTH)}</Row>
            {HISTORY.map((q) => <Choice key={q.key} label={q.question} options={NO_YES} value={answers[q.key]} onChange={set(q.key)} />)}
          </>
        )}
        {step === 2 && LIFESTYLE.map((q) => <Choice key={q.key} label={q.question} options={NO_YES} value={answers[q.key]} onChange={set(q.key)} />)}
        {step === 3 && (
          <>
            <Row label="Days of poor mental health (last 30)">{days('MentHlth')}</Row>
            <Row label="Days of poor physical health (last 30)">{days('PhysHlth')}</Row>
            {ACCESS.map((q) => <Choice key={q.key} label={q.question} options={NO_YES} value={answers[q.key]} onChange={set(q.key)} />)}
          </>
        )}
      </div>

      <div className="wz-foot">
        <button className="btn btn-ghost" onClick={() => setStep(step - 1)} disabled={step === 0 || busy}>Back</button>
        <button className="btn btn-primary" onClick={next} disabled={busy || (step === 0 && !bmiOk) || (last && !bmiOk)}>
          {busy ? <><span className="spinner" /> Scoring…</> : last ? 'See my result' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
