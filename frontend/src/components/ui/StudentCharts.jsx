/* ───────── Student Chart Components ─────────
   Lightweight SVG-only chart components ported from the redesign prototype.
   No external chart library required.
   ───────────────────────────────────────────── */
import { useId } from 'react';

/* ── Area / sparkline chart ── */
export function AreaChart({ data, height = 120, accentVar = 'var(--accent)' }) {
  const w = 100, h = height;
  const max = Math.max(...data), min = Math.min(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - 12 - ((v - min) / span) * (h - 28)]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' ');
  const area = `${line} L${w} ${h} L0 ${h} Z`;
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height, display: 'block' }}>
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accentVar} stopOpacity="0.22" />
          <stop offset="100%" stopColor={accentVar} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#g${id})`} />
      <path d={line} fill="none" stroke={accentVar} strokeWidth="2" vectorEffect="non-scaling-stroke"
        strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => i === pts.length - 1 && (
        <circle key={i} cx={p[0]} cy={p[1]} r="3" fill={accentVar} vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}

/* ── Donut ring chart ── */
export function Donut({ value, size = 92, stroke = 10, color = 'var(--accent)', label }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (value / 100) * c;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.22,1,.36,1)' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: size * 0.26, fontWeight: 600, lineHeight: 1 }}>{value}%</div>
          {label && <div style={{ fontSize: 10.5, color: 'var(--faint)', fontWeight: 600, marginTop: 2 }}>{label}</div>}
        </div>
      </div>
    </div>
  );
}

/* ── Vertical labeled bars ── */
export function LabeledBars({ data, height = 240, suffix = '' }) {
  const max = Math.max(...data.map(d => d.value)) * 1.12;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height, padding: '8px 4px 0' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, height: '100%' }}>
          <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <div style={{ width: '78%', maxWidth: 46, height: `${(d.value / max) * 100}%`, minHeight: 4,
              background: d.color || 'var(--accent)', borderRadius: '6px 6px 3px 3px',
              position: 'relative', transition: 'height .8s cubic-bezier(.22,1,.36,1)' }}>
              <span style={{ position: 'absolute', top: -20, left: 0, right: 0, textAlign: 'center',
                fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 600, color: 'var(--muted)' }}>{d.value}{suffix}</span>
            </div>
          </div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--faint)', textAlign: 'center', whiteSpace: 'nowrap' }}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}
