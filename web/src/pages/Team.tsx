import { useEffect, useState } from 'react';
import { TEAM, type Member } from '../data/team';
import { Close, Expand } from '../components/Icons';

function Photo({ m, onOpen }: { m: Member; onOpen: () => void }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className="team-photo team-initials" aria-hidden="true">{m.initials}</div>;
  return (
    <div className="team-photo">
      <img src={m.photo} alt={m.name} style={{ objectPosition: m.focus ?? '50% 20%' }} onError={() => setFailed(true)} />
      <button className="photo-expand" onClick={onOpen} aria-label={`View full photo of ${m.name}`} title="View full photo"><Expand /></button>
    </div>
  );
}

// Full-size photo over the page. Closes with the X, a click outside the photo, or Esc.
function Lightbox({ m, onClose }: { m: Member; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); html.style.overflow = prev; };
  }, [onClose]);
  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={`Photo of ${m.name}`} onClick={onClose}>
      <figure onClick={(e) => e.stopPropagation()}>
        <img src={m.full ?? m.photo} alt={m.name} />
        <figcaption>{m.name}</figcaption>
      </figure>
      <button className="lightbox-close" onClick={onClose} aria-label="Close photo" autoFocus><Close /></button>
    </div>
  );
}

export default function Team() {
  const [open, setOpen] = useState<Member | null>(null);
  return (
    <div className="team-page">
      <div className="stack" style={{ gap: 6 }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)' }}>Team</h1>
        <p className="muted">21CSE326T Artificial Neural Networks · B.Tech CSE (AI &amp; ML), Semester V, 2026-27 · SRM Institute of Science and Technology, Tiruchirappalli</p>
      </div>
      <div className="team-grid">
        {TEAM.map((m) => (
          <article className="card team-card" key={m.reg}>
            <Photo m={m} onOpen={() => setOpen(m)} />
            <div className="team-text">
              <h3>{m.name}</h3>
              <span className="small muted num">{m.reg}</span>
            </div>
            {m.contributions.length > 0 && (
              <ul className="team-contrib">
                {m.contributions.map((c) => <li key={c}>{c}</li>)}
              </ul>
            )}
          </article>
        ))}
      </div>
      {open && <Lightbox m={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
