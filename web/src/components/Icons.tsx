const base = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
// Logo: a hexagon ring of nodes - a small neural network shaped like the ring of a glucose molecule.
export const Logo = () => (
  <svg {...base} width={26} height={26} stroke="var(--primary)"><line x1="13.47" y1="4.85" x2="17.46" y2="7.15" strokeWidth="1.5" /><line x1="18.93" y1="9.70" x2="18.93" y2="14.30" strokeWidth="1.5" /><line x1="17.46" y1="16.85" x2="13.47" y2="19.15" strokeWidth="1.5" /><line x1="10.53" y1="19.15" x2="6.54" y2="16.85" strokeWidth="1.5" /><line x1="5.07" y1="14.30" x2="5.07" y2="9.70" strokeWidth="1.5" /><line x1="6.54" y1="7.15" x2="10.53" y2="4.85" strokeWidth="1.5" /><line x1="12.00" y1="5.70" x2="12.00" y2="10.30" strokeWidth="1.5" /><line x1="17.46" y1="15.15" x2="13.47" y2="12.85" strokeWidth="1.5" /><line x1="6.54" y1="15.15" x2="10.53" y2="12.85" strokeWidth="1.5" /><circle cx="12.00" cy="4.00" r="1.7" /><circle cx="18.93" cy="8.00" r="1.7" /><circle cx="18.93" cy="16.00" r="1.7" /><circle cx="12.00" cy="20.00" r="1.7" /><circle cx="5.07" cy="16.00" r="1.7" /><circle cx="5.07" cy="8.00" r="1.7" /><circle cx="12" cy="12" r="1.9" fill="currentColor" /></svg>
);
export const Moon = () => <svg {...base} width={16} height={16}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>;
export const Sun = () => (
  <svg {...base} width={16} height={16}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
);
export const Arrow = () => <svg {...base} width={18} height={18}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
export const Back = () => <svg {...base} width={18} height={18}><path d="M19 12H5M11 18l-6-6 6-6" /></svg>;
export const Printer = () => <svg {...base} width={18} height={18}><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>;
export const Shield = () => <svg {...base}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
export const Gauge = () => <svg {...base}><path d="M12 14l4-4" /><path d="M3.3 19a10 10 0 1 1 17.4 0" /></svg>;
export const Layers = () => <svg {...base}><path d="M12 2l10 5-10 5L2 7l10-5z" /><path d="M2 17l10 5 10-5M2 12l10 5 10-5" /></svg>;
export const Stethoscope = () => <svg {...base}><path d="M5 3v6a5 5 0 0 0 10 0V3" /><path d="M10 14v2a5 5 0 0 0 10 0v-3" /><circle cx="20" cy="11" r="2" /></svg>;
