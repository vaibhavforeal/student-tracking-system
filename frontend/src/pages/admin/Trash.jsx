import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import client from '../../api/client';
import ConfirmDialog from '../../components/ConfirmDialog';
import Icon from '../../components/ui/Icon';
import { PageHead } from '../../components/ui/DesignHelpers';

const RETENTION_DAYS = 30;
function daysAgo(dateStr) { return Math.floor((new Date() - new Date(dateStr)) / 86400000); }
function daysLeft(dateStr) { return Math.max(0, RETENTION_DAYS - daysAgo(dateStr)); }
function formatDeletedDate(dateStr) { const d = daysAgo(dateStr); return d === 0 ? 'Today' : d === 1 ? 'Yesterday' : `${d} days ago`; }

const ENTITY_CONFIG = {
  departments: { icon: 'building', label: 'Department', tint: '#7c3aed', getName: i => `${i.code} — ${i.name}` },
  batches:     { icon: 'layers',   label: 'Batch',      tint: 'var(--info)', getName: i => `${i.name} (${i.degree})` },
  sections:    { icon: 'clipboard',label: 'Section',     tint: 'var(--good)', getName: i => `${i.name}${i.batch ? ` — ${i.batch.name}` : ''}` },
  courses:     { icon: 'book',     label: 'Course',      tint: 'var(--warn)', getName: i => { const depts = (i.courseDepartments || []).map(cd => cd.department?.code).filter(Boolean).join(', '); return `${i.code} — ${i.name}${depts ? ` (${depts})` : ''}${i.isMandatory ? ' [Mandatory]' : ''}`; } },
  staff:       { icon: 'users',    label: 'Staff',       tint: 'var(--bad)',  getName: i => i.user?.name || i.employeeId },
  students:    { icon: 'cap',      label: 'Student',     tint: 'var(--accent)', getName: i => `${i.firstName} ${i.lastName} (${i.enrollmentNo})` },
};

export default function Trash() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [restoring, setRestoring] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [clearing, setClearing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({});

  const fetchTrash = async () => { try { const { data: res } = await client.get('/admin/trash'); setData(res); } catch (err) { console.error(err); } finally { setLoading(false); } };
  useEffect(() => { fetchTrash(); }, []);

  const handleRestore = async (type, id) => { setRestoring({ type, id }); try { await client.put(`/admin/${type}/${id}/restore`); fetchTrash(); } catch (err) { alert(err.response?.data?.error || 'Failed to restore'); } finally { setRestoring(null); } };
  const handleDeletePermanently = (type, id, name) => { setConfirmConfig({ title: 'Delete Permanently?', message: `"${name}" will be permanently deleted. This cannot be undone.`, confirmText: 'Delete Forever', onConfirm: async () => { setDeleting({ type, id }); setConfirmOpen(false); try { await client.delete(`/admin/trash/${type}/${id}`); fetchTrash(); } catch (err) { alert(err.response?.data?.error || 'Failed to delete permanently'); } finally { setDeleting(null); } } }); setConfirmOpen(true); };
  const handleClearTrash = () => { setConfirmConfig({ title: 'Empty Trash?', message: `All ${totalCount} item${totalCount !== 1 ? 's' : ''} will be permanently deleted.`, confirmText: 'Empty Trash', onConfirm: async () => { setClearing(true); setConfirmOpen(false); try { await client.delete('/admin/trash/clear'); fetchTrash(); } catch (err) { alert(err.response?.data?.error || 'Failed to clear trash'); } finally { setClearing(false); } } }); setConfirmOpen(true); };

  const allItems = data ? Object.entries(ENTITY_CONFIG).flatMap(([type]) => (data[type] || []).map(item => ({ ...item, _type: type }))).sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt)) : [];
  const filteredItems = filter === 'all' ? allItems : allItems.filter(i => i._type === filter);
  const totalCount = allItems.length;
  const counts = {};
  Object.keys(ENTITY_CONFIG).forEach(type => { counts[type] = (data?.[type] || []).length; });

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg" /></div>;

  return (
    <div className="rd-content-inner">
      <PageHead title="Trash" sub={`Deleted items are kept for ${RETENTION_DAYS} days`}>
        <span className="rd-badge" style={{ color: totalCount > 0 ? 'var(--bad)' : 'var(--good)', background: totalCount > 0 ? 'var(--bad-soft)' : 'var(--good-soft)', fontSize: 13, padding: '5px 14px' }}>
          {totalCount} {totalCount === 1 ? 'item' : 'items'} in trash
        </span>
        {totalCount > 0 && (
          <button className="rd-btn rd-btn-sm" style={{ background: 'var(--bad)', color: '#fff', border: 'none' }} onClick={handleClearTrash} disabled={clearing}>
            <Icon name="trash" /> {clearing ? 'Clearing…' : 'Empty Trash'}
          </button>
        )}
      </PageHead>

      {/* Filter tabs */}
      <div className="rd-toolbar">
        <div className="rd-seg">
          <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>All ({totalCount})</button>
          {Object.entries(ENTITY_CONFIG).map(([type, cfg]) => counts[type] > 0 && (
            <button key={type} className={filter === type ? 'on' : ''} onClick={() => setFilter(type)}>
              {cfg.label === 'Batch' ? 'Batches' : `${cfg.label}s`} ({counts[type]})
            </button>
          ))}
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="rd-card rd-card-pad fade-up" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Icon name="trash" style={{ width: 48, height: 48, color: 'var(--faint)', margin: '0 auto 16px', display: 'block' }} />
          <h3 style={{ color: 'var(--muted)', fontWeight: 600, marginBottom: 8, fontFamily: 'var(--font-display)' }}>Trash is empty</h3>
          <p style={{ color: 'var(--faint)', fontSize: 14 }}>Deleted items appear here for {RETENTION_DAYS} days before being permanently removed.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredItems.map(item => {
            const cfg = ENTITY_CONFIG[item._type];
            const remaining = daysLeft(item.deletedAt);
            const isRestoring = restoring?.type === item._type && restoring?.id === item.id;
            const isDeleting_ = deleting?.type === item._type && deleting?.id === item.id;
            return (
              <div key={`${item._type}-${item.id}`} className="rd-card rd-card-pad fade-up" style={{ display: 'flex', alignItems: 'center', gap: 14, opacity: remaining <= 3 ? 0.7 : 1, borderLeft: `3px solid ${cfg.tint}` }}>
                <div style={{ width: 42, height: 42, borderRadius: 'var(--r-md)', background: `color-mix(in srgb, ${cfg.tint} 10%, transparent)`, display: 'grid', placeItems: 'center', color: cfg.tint, flexShrink: 0 }}>
                  <Icon name={cfg.icon} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 13.5 }}>{cfg.getName(item)}</span>
                    <span className="rd-badge" style={{ background: `color-mix(in srgb, ${cfg.tint} 10%, transparent)`, color: cfg.tint, fontSize: 11 }}>{cfg.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, fontSize: 12, color: 'var(--faint)' }}>
                    <span>Deleted {formatDeletedDate(item.deletedAt)}</span>
                    <span>·</span>
                    <span style={{ color: remaining <= 5 ? 'var(--bad)' : remaining <= 10 ? 'var(--warn)' : 'var(--faint)', fontWeight: remaining <= 5 ? 600 : 400 }}>
                      {remaining === 0 ? 'Expiring today' : `${remaining} day${remaining !== 1 ? 's' : ''} left`}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button className="rd-btn rd-btn-sm" style={{ background: 'var(--good-soft)', color: 'var(--good)', border: 'none' }} onClick={() => handleRestore(item._type, item.id)} disabled={isRestoring || isDeleting_}>
                    {isRestoring ? 'Restoring…' : '↺ Restore'}
                  </button>
                  <button className="rd-btn rd-btn-sm" style={{ background: 'var(--bad-soft)', color: 'var(--bad)', border: 'none' }} onClick={() => handleDeletePermanently(item._type, item.id, cfg.getName(item))} disabled={isRestoring || isDeleting_}>
                    {isDeleting_ ? 'Deleting…' : <><X size={14} style={{ marginBottom: -1 }} /> Delete</>}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalCount > 0 && (
        <div className="rd-card rd-card-pad" style={{ marginTop: 'var(--gap)', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface-2)' }}>
          <Icon name="clock" style={{ color: 'var(--faint)', flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
            <strong>Retention policy:</strong> Items are permanently deleted {RETENTION_DAYS} days after being moved to trash. Restoring also re-activates associated login accounts.
          </p>
        </div>
      )}

      <ConfirmDialog open={confirmOpen} title={confirmConfig.title} message={confirmConfig.message} confirmText={confirmConfig.confirmText} onConfirm={confirmConfig.onConfirm || (() => {})} onCancel={() => setConfirmOpen(false)} />
    </div>
  );
}
