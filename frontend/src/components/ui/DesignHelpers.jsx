/* ───────── Design Helpers ─────────
   Shared utilities, color maps, and reusable micro-components
   for the redesigned admin UI.
   ─────────────────────────────────── */
import Icon from './Icon';

/* Department hue map (code → background color string) */
const DEPT_HUE = {
  indigo: '#5b54e6',
  teal: '#19a89a',
  amber: '#c98a1e',
  rose: '#d2553f',
  violet: '#9b3d8f',
};

/* Map department code → hue key */
const deptHueKey = (code) =>
  ({ CSE: 'indigo', ECE: 'teal', MECH: 'amber', CIVIL: 'rose', IT: 'violet' }[code] || 'indigo');

/* Get actual color for a department code */
const deptColor = (code) => DEPT_HUE[deptHueKey(code)] || 'var(--accent)';

/* Deterministic avatar color from a string */
const AVATAR_HUES = ['#5b54e6', '#19a89a', '#c98a1e', '#d2553f', '#9b3d8f', '#3b7ec9', '#2f9968'];
function hueFor(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % AVATAR_HUES.length;
  return AVATAR_HUES[h];
}

/* Reusable page section header */
export function PageHead({ title, sub, children }) {
  return (
    <div className="rd-section-head fade-up">
      <div>
        <h1>{title}</h1>
        <p>{sub}</p>
      </div>
      {children && <div style={{ display: 'flex', gap: 10 }}>{children}</div>}
    </div>
  );
}

/* Department tag with colored swatch */
export function DeptTag({ code }) {
  return (
    <span className="rd-dept-tag">
      <span className="rd-dept-swatch" style={{ background: deptColor(code) }} />
      {code}
    </span>
  );
}

/* Mini avatar circle with initials */
export function MiniAvatar({ name, size = 34, style: extraStyle }) {
  const parts = (name || '').split(' ');
  const ini = parts.map(n => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div
      className="rd-mini-avatar"
      style={{ width: size, height: size, background: hueFor(name || ''), ...extraStyle }}
    >
      {ini}
    </div>
  );
}

/* Status badge */
export function StatusBadge({ status }) {
  return (
    <span className={`rd-badge rd-badge-${status}`}>
      <span className="rd-badge-dot" style={{ background: 'currentColor' }} />
      {status}
    </span>
  );
}

/* Attendance meter bar */
export function Meter({ value, showValue = true }) {
  const color = value >= 75 ? 'var(--good)' : value >= 65 ? 'var(--warn)' : 'var(--bad)';
  return (
    <div className="rd-meter">
      <div className="rd-meter-track">
        <div className="rd-meter-fill" style={{ width: `${value}%`, background: color }} />
      </div>
      {showValue && <span className="rd-meter-val">{value}%</span>}
    </div>
  );
}

/* Stat tile (used on dashboard, alumni, etc.) */
export function StatTile({ label, value, delta, up, icon, tint, soft, good, accent, delay = 0, compact }) {
  /* Convenience booleans → tint/soft */
  const t = tint || (good ? 'var(--good)' : accent ? 'var(--accent)' : 'var(--info)');
  const s = soft || `color-mix(in srgb, ${t} 10%, transparent)`;
  return (
    <div className={`rd-stat fade-up ${compact ? 'rd-stat-compact' : ''}`} style={{ animationDelay: `${delay}ms` }}>
      <div className="rd-stat-top">
        <div className="rd-stat-ico" style={{ background: s, color: t }}>
          <Icon name={icon} />
        </div>
        {delta != null && (
          <div className={`rd-stat-delta ${up ? 'up' : 'down'}`}>
            <Icon name={up ? 'arrowUp' : 'down'} style={{ width: 13, height: 13 }} />{delta}
          </div>
        )}
      </div>
      <div className="rd-stat-val">{value}</div>
      <div className="rd-stat-label">{label}</div>
    </div>
  );
}
