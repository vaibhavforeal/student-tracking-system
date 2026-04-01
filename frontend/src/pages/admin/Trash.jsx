import { useState, useEffect } from 'react';
import client from '../../api/client';
import ConfirmDialog from '../../components/ConfirmDialog';
import {
  HiOutlineRefresh, HiOutlineOfficeBuilding, HiOutlineCollection,
  HiOutlineClipboardList, HiOutlineBookOpen, HiOutlineUserGroup,
  HiOutlineAcademicCap, HiOutlineClock, HiOutlineTrash,
} from 'react-icons/hi';

const RETENTION_DAYS = 30;

function daysAgo(dateStr) {
  const deleted = new Date(dateStr);
  const now = new Date();
  return Math.floor((now - deleted) / (1000 * 60 * 60 * 24));
}

function daysLeft(dateStr) {
  return Math.max(0, RETENTION_DAYS - daysAgo(dateStr));
}

function formatDeletedDate(dateStr) {
  const d = daysAgo(dateStr);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  return `${d} days ago`;
}

const ENTITY_CONFIG = {
  departments: { icon: HiOutlineOfficeBuilding, label: 'Department', color: '#7c3aed', bg: '#f5f3ff', getName: (item) => `${item.code} — ${item.name}` },
  batches:     { icon: HiOutlineCollection, label: 'Batch', color: '#0284c7', bg: '#f0f9ff', getName: (item) => `${item.name} (${item.degree})` },
  sections:    { icon: HiOutlineClipboardList, label: 'Section', color: '#059669', bg: '#ecfdf5', getName: (item) => `${item.name}${item.batch ? ` — ${item.batch.name}` : ''}` },
  courses:     { icon: HiOutlineBookOpen, label: 'Course', color: '#d97706', bg: '#fffbeb', getName: (item) => `${item.code} — ${item.name}` },
  staff:       { icon: HiOutlineUserGroup, label: 'Staff', color: '#dc2626', bg: '#fef2f2', getName: (item) => item.user?.name || item.employeeId },
  students:    { icon: HiOutlineAcademicCap, label: 'Student', color: '#7c3aed', bg: '#faf5ff', getName: (item) => `${item.firstName} ${item.lastName} (${item.enrollmentNo})` },
};

export default function Trash() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [restoring, setRestoring] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [clearing, setClearing] = useState(false);

  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({});

  const fetchTrash = async () => {
    try {
      const { data: res } = await client.get('/admin/trash');
      setData(res);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTrash(); }, []);

  const handleRestore = async (type, id) => {
    setRestoring({ type, id });
    try {
      await client.put(`/admin/${type}/${id}/restore`);
      fetchTrash();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to restore');
    } finally {
      setRestoring(null);
    }
  };

  const handleDeletePermanently = (type, id, name) => {
    setConfirmConfig({
      title: 'Delete Permanently?',
      message: `"${name}" will be permanently deleted. This action cannot be undone and all associated data will be lost.`,
      confirmText: 'Delete Forever',
      onConfirm: async () => {
        setDeleting({ type, id });
        setConfirmOpen(false);
        try {
          await client.delete(`/admin/trash/${type}/${id}`);
          fetchTrash();
        } catch (err) {
          alert(err.response?.data?.error || 'Failed to delete permanently');
        } finally {
          setDeleting(null);
        }
      },
    });
    setConfirmOpen(true);
  };

  const handleClearTrash = () => {
    setConfirmConfig({
      title: 'Empty Trash?',
      message: `All ${totalCount} item${totalCount !== 1 ? 's' : ''} in the trash will be permanently deleted. This action cannot be undone.`,
      confirmText: 'Empty Trash',
      onConfirm: async () => {
        setClearing(true);
        setConfirmOpen(false);
        try {
          await client.delete('/admin/trash/clear');
          fetchTrash();
        } catch (err) {
          alert(err.response?.data?.error || 'Failed to clear trash');
        } finally {
          setClearing(false);
        }
      },
    });
    setConfirmOpen(true);
  };

  // Build a flat, sorted list of all deleted items
  const allItems = data ? Object.entries(ENTITY_CONFIG).flatMap(([type]) => {
    const items = data[type] || [];
    return items.map((item) => ({ ...item, _type: type }));
  }).sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt)) : [];

  const filteredItems = filter === 'all' ? allItems : allItems.filter((i) => i._type === filter);
  const totalCount = allItems.length;

  // Counts per entity
  const counts = {};
  Object.keys(ENTITY_CONFIG).forEach((type) => {
    counts[type] = (data?.[type] || []).length;
  });

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Trash</h1>
          <p className="page-subtitle">
            Deleted items are kept for {RETENTION_DAYS} days before permanent removal
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div style={{
            padding: 'var(--space-2) var(--space-4)',
            background: totalCount > 0 ? '#fef2f2' : '#ecfdf5',
            borderRadius: 'var(--radius-full)',
            fontSize: 'var(--font-sm)',
            fontWeight: 600,
            color: totalCount > 0 ? '#dc2626' : '#059669',
          }}>
            {totalCount} {totalCount === 1 ? 'item' : 'items'} in trash
          </div>
          {totalCount > 0 && (
            <button
              className="btn btn-sm"
              onClick={handleClearTrash}
              disabled={clearing}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: '#dc2626', color: 'white', border: 'none',
                padding: 'var(--space-2) var(--space-4)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-sm)', fontWeight: 600,
                cursor: 'pointer', opacity: clearing ? 0.7 : 1,
                transition: 'all var(--transition-fast)',
              }}
              onMouseEnter={(e) => { if (!clearing) e.target.style.background = '#b91c1c'; }}
              onMouseLeave={(e) => { e.target.style.background = '#dc2626'; }}
            >
              <HiOutlineTrash size={14} />
              {clearing ? 'Clearing...' : 'Empty Trash'}
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{
        display: 'flex', gap: '6px', marginBottom: 'var(--space-6)',
        padding: '4px', background: 'var(--color-gray-100)',
        borderRadius: 'var(--radius-lg)', width: 'fit-content',
      }}>
        <button
          onClick={() => setFilter('all')}
          style={{
            padding: 'var(--space-2) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            border: 'none', cursor: 'pointer',
            fontSize: 'var(--font-sm)', fontWeight: 500,
            background: filter === 'all' ? 'white' : 'transparent',
            color: filter === 'all' ? 'var(--color-gray-800)' : 'var(--color-gray-500)',
            boxShadow: filter === 'all' ? 'var(--shadow-sm)' : 'none',
            transition: 'all var(--transition-fast)',
          }}
        >
          All ({totalCount})
        </button>
        {Object.entries(ENTITY_CONFIG).map(([type, cfg]) => (
          counts[type] > 0 && (
            <button
              key={type}
              onClick={() => setFilter(type)}
              style={{
                padding: 'var(--space-2) var(--space-4)',
                borderRadius: 'var(--radius-md)',
                border: 'none', cursor: 'pointer',
                fontSize: 'var(--font-sm)', fontWeight: 500,
                background: filter === type ? 'white' : 'transparent',
                color: filter === type ? cfg.color : 'var(--color-gray-500)',
                boxShadow: filter === type ? 'var(--shadow-sm)' : 'none',
                transition: 'all var(--transition-fast)',
              }}
            >
              {cfg.label === 'Batch' ? 'Batches' : `${cfg.label}s`} ({counts[type]})
            </button>
          )
        ))}
      </div>

      {/* Empty state */}
      {filteredItems.length === 0 ? (
        <div className="card" style={{ padding: 'var(--space-12)', textAlign: 'center' }}>
          <HiOutlineTrash size={48} style={{ color: 'var(--color-gray-300)', margin: '0 auto var(--space-4)' }} />
          <h3 style={{ color: 'var(--color-gray-500)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>Trash is empty</h3>
          <p style={{ color: 'var(--color-gray-400)', fontSize: 'var(--font-sm)' }}>
            Deleted items will appear here for {RETENTION_DAYS} days before being permanently removed.
          </p>
        </div>
      ) : (
        /* Timeline list */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {filteredItems.map((item) => {
            const cfg = ENTITY_CONFIG[item._type];
            const Icon = cfg.icon;
            const remaining = daysLeft(item.deletedAt);
            const isRestoring = restoring?.type === item._type && restoring?.id === item.id;
            const isDeleting = deleting?.type === item._type && deleting?.id === item.id;

            return (
              <div
                key={`${item._type}-${item.id}`}
                className="card"
                style={{
                  padding: 'var(--space-4) var(--space-5)',
                  display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
                  opacity: remaining <= 3 ? 0.7 : 1,
                  borderLeft: `3px solid ${cfg.color}`,
                }}
              >
                {/* Icon */}
                <div style={{
                  width: '42px', height: '42px', borderRadius: 'var(--radius-lg)',
                  background: cfg.bg, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', flexShrink: 0,
                }}>
                  <Icon size={20} style={{ color: cfg.color }} />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-gray-800)' }}>
                      {cfg.getName(item)}
                    </span>
                    <span className={`badge`} style={{ background: cfg.bg, color: cfg.color }}>
                      {cfg.label}
                    </span>
                  </div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                    marginTop: '4px', fontSize: 'var(--font-xs)', color: 'var(--color-gray-400)',
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <HiOutlineClock size={13} />
                      Deleted {formatDeletedDate(item.deletedAt)}
                    </span>
                    <span>•</span>
                    <span style={{
                      color: remaining <= 5 ? '#dc2626' : remaining <= 10 ? '#d97706' : 'var(--color-gray-400)',
                      fontWeight: remaining <= 5 ? 600 : 400,
                    }}>
                      {remaining === 0 ? 'Expiring today' : `${remaining} day${remaining !== 1 ? 's' : ''} left`}
                    </span>
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexShrink: 0 }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleRestore(item._type, item.id)}
                    disabled={isRestoring || isDeleting}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      color: '#059669', borderColor: '#bbf7d0',
                      background: '#f0fdf4',
                    }}
                  >
                    <HiOutlineRefresh size={14} style={{ transform: isRestoring ? 'rotate(360deg)' : 'none', transition: 'transform 0.5s' }} />
                    {isRestoring ? 'Restoring...' : 'Restore'}
                  </button>
                  <button
                    className="btn btn-sm"
                    onClick={() => handleDeletePermanently(item._type, item.id, cfg.getName(item))}
                    disabled={isRestoring || isDeleting}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      color: '#dc2626', borderColor: '#fecaca',
                      background: '#fef2f2', border: '1px solid #fecaca',
                      padding: '6px 12px', borderRadius: 'var(--radius-md)',
                      fontSize: 'var(--font-xs)', fontWeight: 500,
                      cursor: 'pointer', opacity: isDeleting ? 0.7 : 1,
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    <HiOutlineTrash size={14} />
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Retention policy footer */}
      {totalCount > 0 && (
        <div style={{
          marginTop: 'var(--space-6)', padding: 'var(--space-4) var(--space-5)',
          background: 'var(--color-gray-50)', borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-gray-100)',
          display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
        }}>
          <HiOutlineClock size={18} style={{ color: 'var(--color-gray-400)', flexShrink: 0 }} />
          <p style={{ fontSize: 'var(--font-sm)', color: 'var(--color-gray-500)', margin: 0 }}>
            <strong>Retention policy:</strong> Items are permanently deleted {RETENTION_DAYS} days after being moved to trash.
            Restoring an item will put it back in its original location. Staff and student restores also re-activate their login accounts.
          </p>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        onConfirm={confirmConfig.onConfirm || (() => {})}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
