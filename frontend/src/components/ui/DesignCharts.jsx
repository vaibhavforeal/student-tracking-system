/* ───────── Chart Components for Redesigned UI ─────────
   Ported from ui.jsx and ui2.jsx of the redesign prototype.
   ─────────────────────────────────────────────────────── */
import { useId } from 'react';

/* ───────── Area / line chart ───────── */
export function AreaChart({ data, height = 120, accentVar = 'var(--accent)' }) {
  const w = 100, h = height;
  const max = Math.max(...data), min = Math.min(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - 12 - ((v - min) / span) * (h - 28)]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' ');
  const area = `${line} L${w} ${h} L0 ${h} Z`;
  const rawId = useId();
  const id = rawId.replace(/:/g, '');
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

/* ───────── Donut ───────── */
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

/* ───────── Mini bars (grade distribution) ───────── */
export function MiniBars({ data, height = 110 }) {
  const max = Math.max(...data.map(d => d.value));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height, padding: '0 2px' }}>
      {data.map((d, i) => {
        const col = d.color === 'good' ? 'var(--good)' : d.color === 'low' ? 'var(--bad)' : 'var(--accent)';
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
            <div style={{ width: '100%', flex: 1, display: 'flex', alignItems: 'flex-end' }}>
              <div style={{ width: '100%', height: `${(d.value / max) * 100}%`, background: col,
                borderRadius: '5px 5px 3px 3px', minHeight: 4, transition: 'height .8s cubic-bezier(.22,1,.36,1)', opacity: .9 }} />
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{d.grade}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ───────── Labeled vertical bars (analytics) ───────── */
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

/* ───────── Donut / pie distribution + legend ───────── */
export function PieChart({ data, size = 180 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = size / 2, ir = r * 0.62, cx = r, cy = r;

  if (total <= 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
        <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
          <svg width={size} height={size}>
            <circle cx={cx} cy={cy} r={r} fill="var(--surface-3)" />
            <circle cx={cx} cy={cy} r={ir} fill="var(--surface)" />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: size * 0.18, fontWeight: 600, lineHeight: 1 }}>0</div>
              <div style={{ fontSize: 11, color: 'var(--faint)', fontWeight: 600 }}>Total</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const arcs = data.map((item, index) => {
    const start = data.slice(0, index).reduce((sum, d) => sum + d.value, 0);
    const end = start + item.value;
    const a0 = (start / total) * Math.PI * 2 - Math.PI / 2;
    const a1 = (end / total) * Math.PI * 2 - Math.PI / 2;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const p = (ang, rad) => [cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad];
    const [x0, y0] = p(a0, r), [x1, y1] = p(a1, r), [x2, y2] = p(a1, ir), [x3, y3] = p(a0, ir);
    return { d: `M${x0} ${y0} A${r} ${r} 0 ${large} 1 ${x1} ${y1} L${x2} ${y2} A${ir} ${ir} 0 ${large} 0 ${x3} ${y3} Z`, color: item.color };
  });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size}>{arcs.map((a, i) => <path key={i} d={a.d} fill={a.color} stroke="var(--surface)" strokeWidth="2" />)}</svg>
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: size * 0.18, fontWeight: 600, lineHeight: 1 }}>{total.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: 'var(--faint)', fontWeight: 600 }}>Total</div>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ width: 11, height: 11, borderRadius: 3, background: d.color, flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 500 }}>{d.label}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, fontWeight: 600, color: 'var(--muted)', marginLeft: 4 }}>
              {Math.round((d.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
