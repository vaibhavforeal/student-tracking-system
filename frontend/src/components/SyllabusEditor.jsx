import { useState } from 'react';
import { HiOutlinePlus, HiOutlineTrash, HiChevronDown, HiChevronRight } from 'react-icons/hi';

/**
 * SyllabusEditor — Reusable component for editing syllabus units + topics.
 * 
 * Props:
 *   units: Array of { number, title, hours?, topics: [{ order, title, description? }] }
 *   onChange: (units) => void — called whenever units change
 *   readOnly?: boolean
 */
export default function SyllabusEditor({ units = [], onChange, readOnly = false }) {
  const [expandedUnits, setExpandedUnits] = useState(new Set());

  const toggleExpand = (idx) => {
    setExpandedUnits((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const addUnit = () => {
    const newNumber = units.length > 0 ? Math.max(...units.map((u) => u.number)) + 1 : 1;
    const updated = [...units, { number: newNumber, title: '', hours: '', topics: [] }];
    onChange(updated);
    setExpandedUnits((prev) => new Set(prev).add(units.length));
  };

  const updateUnit = (idx, field, value) => {
    const updated = units.map((u, i) => (i === idx ? { ...u, [field]: value } : u));
    onChange(updated);
  };

  const removeUnit = (idx) => {
    const updated = units.filter((_, i) => i !== idx).map((u, i) => ({ ...u, number: i + 1 }));
    onChange(updated);
    setExpandedUnits((prev) => {
      const next = new Set();
      for (const v of prev) {
        if (v < idx) next.add(v);
        else if (v > idx) next.add(v - 1);
      }
      return next;
    });
  };

  const moveUnit = (idx, direction) => {
    if ((direction === -1 && idx === 0) || (direction === 1 && idx === units.length - 1)) return;
    const updated = [...units];
    const target = idx + direction;
    [updated[idx], updated[target]] = [updated[target], updated[idx]];
    const renumbered = updated.map((u, i) => ({ ...u, number: i + 1 }));
    onChange(renumbered);
  };

  const addTopic = (unitIdx) => {
    const unit = units[unitIdx];
    const newOrder = unit.topics.length > 0 ? Math.max(...unit.topics.map((t) => t.order)) + 1 : 1;
    const updated = units.map((u, i) =>
      i === unitIdx ? { ...u, topics: [...u.topics, { order: newOrder, title: '', description: '' }] } : u
    );
    onChange(updated);
  };

  const updateTopic = (unitIdx, topicIdx, field, value) => {
    const updated = units.map((u, i) =>
      i === unitIdx
        ? { ...u, topics: u.topics.map((t, j) => (j === topicIdx ? { ...t, [field]: value } : t)) }
        : u
    );
    onChange(updated);
  };

  const removeTopic = (unitIdx, topicIdx) => {
    const updated = units.map((u, i) =>
      i === unitIdx
        ? { ...u, topics: u.topics.filter((_, j) => j !== topicIdx).map((t, j) => ({ ...t, order: j + 1 })) }
        : u
    );
    onChange(updated);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {units.length === 0 && (
        <div style={{
          padding: '20px', textAlign: 'center', color: 'var(--color-text-muted, #94a3b8)',
          background: 'var(--color-surface, #f8fafc)', borderRadius: '8px',
          border: '1px dashed var(--color-border, #e2e8f0)',
        }}>
          No units added yet. {!readOnly && 'Click "Add Unit" to start building the syllabus.'}
        </div>
      )}

      {units.map((unit, unitIdx) => (
        <div key={unitIdx} style={{
          border: '1px solid var(--color-border, #e2e8f0)',
          borderRadius: '10px', overflow: 'hidden',
          background: '#fff',
        }}>
          {/* Unit header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '10px 14px',
            background: 'linear-gradient(135deg, #f0f7ff 0%, #f5f0ff 100%)',
            cursor: 'pointer',
          }} onClick={() => toggleExpand(unitIdx)}>
            <span style={{ color: 'var(--color-primary, #6366f1)', fontSize: '14px' }}>
              {expandedUnits.has(unitIdx) ? <HiChevronDown /> : <HiChevronRight />}
            </span>
            <span style={{
              background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
              color: '#fff', borderRadius: '6px', padding: '2px 8px',
              fontSize: '0.75rem', fontWeight: 600, minWidth: '28px', textAlign: 'center',
            }}>
              U{unit.number}
            </span>
            {readOnly ? (
              <span style={{ fontWeight: 500, flex: 1, fontSize: '0.9rem' }}>{unit.title || '(Untitled)'}</span>
            ) : (
              <input
                className="form-input"
                value={unit.title}
                onChange={(e) => updateUnit(unitIdx, 'title', e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="Unit title"
                style={{ flex: 1, padding: '4px 8px', fontSize: '0.9rem', fontWeight: 500 }}
              />
            )}
            {!readOnly && (
              <>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  value={unit.hours || ''}
                  onChange={(e) => updateUnit(unitIdx, 'hours', e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Hrs"
                  style={{ width: '60px', padding: '4px 8px', fontSize: '0.85rem', textAlign: 'center' }}
                />
                <button
                  type="button" className="btn btn-ghost btn-sm"
                  onClick={(e) => { e.stopPropagation(); moveUnit(unitIdx, -1); }}
                  disabled={unitIdx === 0}
                  title="Move up" style={{ padding: '2px 4px', fontSize: '12px' }}
                >↑</button>
                <button
                  type="button" className="btn btn-ghost btn-sm"
                  onClick={(e) => { e.stopPropagation(); moveUnit(unitIdx, 1); }}
                  disabled={unitIdx === units.length - 1}
                  title="Move down" style={{ padding: '2px 4px', fontSize: '12px' }}
                >↓</button>
                <button
                  type="button" className="btn btn-ghost btn-sm"
                  onClick={(e) => { e.stopPropagation(); removeUnit(unitIdx); }}
                  title="Remove unit"
                  style={{ color: 'var(--color-danger, #ef4444)', padding: '2px 4px' }}
                ><HiOutlineTrash size={14} /></button>
              </>
            )}
            {unit.hours && (
              <span style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                {unit.hours}h
              </span>
            )}
          </div>

          {/* Topics area (expanded) */}
          {expandedUnits.has(unitIdx) && (
            <div style={{ padding: '10px 14px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {unit.topics.length === 0 && (
                <div style={{
                  padding: '10px', textAlign: 'center', color: '#94a3b8',
                  fontSize: '0.82rem', fontStyle: 'italic',
                }}>
                  No topics in this unit.
                </div>
              )}

              {unit.topics.map((topic, topicIdx) => (
                <div key={topicIdx} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '8px',
                  padding: '6px 8px', borderRadius: '6px',
                  background: '#fafbfd',
                  border: '1px solid #f1f5f9',
                }}>
                  <span style={{
                    fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600,
                    minWidth: '22px', textAlign: 'center', paddingTop: '6px',
                  }}>
                    {topic.order}.
                  </span>
                  {readOnly ? (
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{topic.title}</div>
                      {topic.description && (
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>{topic.description}</div>
                      )}
                    </div>
                  ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <input
                        className="form-input"
                        value={topic.title}
                        onChange={(e) => updateTopic(unitIdx, topicIdx, 'title', e.target.value)}
                        placeholder="Topic title"
                        style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                      />
                      <input
                        className="form-input"
                        value={topic.description || ''}
                        onChange={(e) => updateTopic(unitIdx, topicIdx, 'description', e.target.value)}
                        placeholder="Description (optional)"
                        style={{ padding: '4px 8px', fontSize: '0.8rem', color: '#64748b' }}
                      />
                    </div>
                  )}
                  {!readOnly && (
                    <button
                      type="button" className="btn btn-ghost btn-sm"
                      onClick={() => removeTopic(unitIdx, topicIdx)}
                      style={{ color: 'var(--color-danger, #ef4444)', padding: '2px 4px', marginTop: '2px' }}
                    ><HiOutlineTrash size={12} /></button>
                  )}
                </div>
              ))}

              {!readOnly && (
                <button
                  type="button"
                  onClick={() => addTopic(unitIdx)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    padding: '6px 10px', fontSize: '0.8rem', color: 'var(--color-primary, #6366f1)',
                    background: 'none', border: '1px dashed var(--color-primary, #6366f1)',
                    borderRadius: '6px', cursor: 'pointer', alignSelf: 'flex-start',
                    transition: 'background 0.15s',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = '#f0f7ff')}
                  onMouseOut={(e) => (e.currentTarget.style.background = 'none')}
                >
                  <HiOutlinePlus size={12} /> Add Topic
                </button>
              )}
            </div>
          )}
        </div>
      ))}

      {!readOnly && (
        <button
          type="button"
          onClick={addUnit}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center',
            padding: '10px 16px', fontSize: '0.85rem', fontWeight: 500,
            color: '#fff',
            background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
            border: 'none', borderRadius: '8px', cursor: 'pointer',
            transition: 'opacity 0.15s',
          }}
          onMouseOver={(e) => (e.currentTarget.style.opacity = '0.9')}
          onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
        >
          <HiOutlinePlus size={14} /> Add Unit
        </button>
      )}
    </div>
  );
}
