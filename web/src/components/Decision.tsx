import type { Decision } from '../lib/types';
import { DECISION_TEXT } from '../lib/format';

export function DecisionBadge({ d, small }: { d: Decision; small?: boolean }) {
  return <span className={`badge ${d}${small ? ' small' : ''}`}>{DECISION_TEXT[d].title}</span>;
}
export const decisionColor = (d: Decision) => (d === 'higher' ? 'var(--high)' : d === 'refer' ? 'var(--refer)' : 'var(--low)');
