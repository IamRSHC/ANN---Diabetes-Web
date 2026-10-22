import type { Decision } from './types';
export const pct = (x: number, d = 1) => `${(x * 100).toFixed(d)}%`;
export const DECISION_TEXT: Record<Decision, { title: string; body: string }> = {
  higher: { title: 'Higher risk', body: 'Your estimated risk is above the screening threshold. Please book a blood test (HbA1c or fasting glucose) with a doctor.' },
  lower: { title: 'Lower risk', body: 'Your estimated risk is below the screening threshold. Keep up regular check-ups and a healthy routine.' },
  refer: { title: 'Refer to doctor', body: 'The model is not confident about your result: your risk lies too close to the screening threshold for its uncertainty. A doctor and a blood test should decide.' },
};
