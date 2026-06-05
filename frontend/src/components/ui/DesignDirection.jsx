/* ───────── Design Direction (Tweaks) Popover ─────────
   Theme, accent color, and mood selector.
   ──────────────────────────────────────────────────── */
import { useState, useRef, useEffect } from 'react';
import Icon from './Icon';

const ACCENTS = [
  { key: 'indigo', color: '#4f46e5', label: 'Indigo' },
  { key: 'emerald', color: '#0f9d6b', label: 'Emerald' },
  { key: 'amber', color: '#bd7a12', label: 'Amber' },
  { key: 'plum', color: '#9b3d8f', label: 'Plum' },
];

const MOODS = [
  { key: 'crisp', label: 'Crisp' },
  { key: 'soft', label: 'Soft' },
  { key: 'editorial', label: 'Editorial' },
];

function getStored(k, fallback) {
  try { return localStorage.getItem(`sts-tweak-${k}`) || fallback; } catch { return fallback; }
}

export default function DesignDirection() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const [theme, setTheme] = useState(() => getStored('theme', document.documentElement.dataset.theme || 'light'));
  const [accent, setAccent] = useState(() => getStored('accent', 'indigo'));
  const [mood, setMood] = useState(() => getStored('mood', 'crisp'));

  // Apply on mount & changes
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.accent = accent;
    document.documentElement.dataset.mood = mood;
    localStorage.setItem('sts-tweak-theme', theme);
    localStorage.setItem('sts-tweak-accent', accent);
    localStorage.setItem('sts-tweak-mood', mood);
  }, [theme, accent, mood]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button
        className="rd-icon-btn"
        onClick={() => setOpen(!open)}
        title="Design Direction"
      >
        <Icon name="sliders" />
      </button>

      {open && (
        <div className="rd-tweak-pop">
          <div className="rd-tweak-title">Design Direction</div>

          {/* Theme */}
          <div className="rd-tweak-grp">
            <div className="rd-tweak-lbl">Theme</div>
            <div className="rd-seg full">
              <button className={theme === 'light' ? 'on' : ''} onClick={() => setTheme('light')}>
                <Icon name="sun" style={{ width: 15, height: 15 }} /> Light
              </button>
              <button className={theme === 'dark' ? 'on' : ''} onClick={() => setTheme('dark')}>
                <Icon name="moon" style={{ width: 15, height: 15 }} /> Dark
              </button>
            </div>
          </div>

          {/* Accent */}
          <div className="rd-tweak-grp">
            <div className="rd-tweak-lbl">Accent</div>
            <div className="rd-swatch-row">
              {ACCENTS.map(a => (
                <div
                  key={a.key}
                  className={`rd-swatch ${accent === a.key ? 'on' : ''}`}
                  style={{ background: a.color }}
                  title={a.label}
                  onClick={() => setAccent(a.key)}
                />
              ))}
            </div>
          </div>

          {/* Mood */}
          <div className="rd-tweak-grp">
            <div className="rd-tweak-lbl">Mood</div>
            <div className="rd-seg full">
              {MOODS.map(m => (
                <button key={m.key} className={mood === m.key ? 'on' : ''} onClick={() => setMood(m.key)}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
