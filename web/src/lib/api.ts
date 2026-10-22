// The proposed ANN always runs in the browser (instant, works offline). The Python API adds Model 1 (seven classical
// classifiers + stacking). If the API is not configured or does not answer in time, Model 1 is shown as unavailable.
import { loadAnn, scoreAnn } from './ann';
import { LABELS } from './questions';
import type { Answers, AnnResult, ModelScore } from './types';

const API = (import.meta.env.VITE_API_URL as string | undefined)?.trim().replace(/\/$/, '') || '';
export const apiConfigured = Boolean(API);

export async function scoreLocal(row: Answers): Promise<AnnResult> {
  return scoreAnn(row, await loadAnn(), LABELS);
}

export async function fetchModels(row: Answers, timeoutMs = 75000): Promise<ModelScore[] | null> {
  if (!API) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API}/predict`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(row), signal: ctrl.signal });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data.models) ? (data.models as ModelScore[]) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
