import { useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Screen from './pages/Screen';
import Results from './pages/Results';
import Dashboard from './pages/Dashboard';
import HowItWorks from './pages/HowItWorks';
import Team from './pages/Team';
import { Close, Logo, Menu, Moon, Sun } from './components/Icons';

const LINKS: [string, string][] = [['/results', 'Results'], ['/models', 'Model performance'], ['/how-it-works', 'How it works'], ['/team', 'Team']];

type Theme = 'light' | 'dark';
const initialTheme = (): Theme => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');

export default function App() {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const dark = theme === 'dark';
  const toggleTheme = () => setTheme(dark ? 'light' : 'dark');

  useEffect(() => {
    if (theme === 'dark') document.documentElement.dataset.theme = 'dark';
    else delete document.documentElement.dataset.theme;
    try { localStorage.setItem('theme', theme); } catch { /* storage blocked: theme still works for this visit */ }
  }, [theme]);
  useEffect(() => { window.scrollTo(0, 0); setMenuOpen(false); }, [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <div className="shell">
      <header className="header">
        <div className="container">
          <Link to="/" className="brand"><Logo /> Diabetes Risk Screening</Link>
          <nav className="nav nav-desktop" aria-label="Main">
            {LINKS.map(([to, label]) => <NavLink key={to} to={to}>{label}</NavLink>)}
            <button className="toggle" onClick={toggleTheme} aria-label={`Switch to ${dark ? 'light' : 'dark'} mode`}>
              {dark ? <Sun /> : <Moon />} {dark ? 'Light' : 'Dark'}
            </button>
          </nav>
          <div className="nav-mobile">
            <button className="icon-btn" onClick={toggleTheme} aria-label={`Switch to ${dark ? 'light' : 'dark'} mode`}>{dark ? <Sun /> : <Moon />}</button>
            <button className="icon-btn" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} aria-controls="mobile-menu">
              {menuOpen ? <Close /> : <Menu />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav id="mobile-menu" className="mobile-menu" aria-label="Main">
            <div className="container">
              {LINKS.map(([to, label]) => <NavLink key={to} to={to}>{label}</NavLink>)}
            </div>
          </nav>
        )}
      </header>
      {menuOpen && <div className="menu-backdrop" onClick={() => setMenuOpen(false)} aria-hidden="true" />}
      <main>
        <div className="container">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/screen" element={<Screen />} />
            <Route path="/results" element={<Results />} />
            <Route path="/models" element={<Dashboard />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/team" element={<Team />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
