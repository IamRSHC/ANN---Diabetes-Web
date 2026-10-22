import { useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Screen from './pages/Screen';
import Results from './pages/Results';
import Dashboard from './pages/Dashboard';
import HowItWorks from './pages/HowItWorks';
import Team from './pages/Team';
import { Logo, Moon, Sun } from './components/Icons';

type Theme = 'light' | 'dark';
const initialTheme = (): Theme => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');

export default function App() {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const { pathname } = useLocation();

  useEffect(() => {
    if (theme === 'dark') document.documentElement.dataset.theme = 'dark';
    else delete document.documentElement.dataset.theme;
    try { localStorage.setItem('theme', theme); } catch { /* storage blocked: theme still works for this visit */ }
  }, [theme]);
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  return (
    <div className="shell">
      <header className="header">
        <div className="container">
          <Link to="/" className="brand"><Logo /> Diabetes Risk Screening</Link>
          <nav className="nav" aria-label="Main">
            <NavLink to="/results">Results</NavLink>
            <NavLink to="/models">Model performance</NavLink>
            <NavLink to="/how-it-works">How it works</NavLink>
            <NavLink to="/team">Team</NavLink>
            <button className="toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
              {theme === 'dark' ? <Sun /> : <Moon />} {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
          </nav>
        </div>
      </header>
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
