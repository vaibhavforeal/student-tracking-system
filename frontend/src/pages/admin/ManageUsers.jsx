import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import client from '../../api/client';
import useAuthStore from '../../store/authStore';
import Icon from '../../components/ui/Icon';
import { PageHead, MiniAvatar, StatusBadge } from '../../components/ui/DesignHelpers';

const ROLE_TABS = ['all', 'admin', 'teacher', 'student'];
const ROLE_COLORS = { admin: { color: 'var(--accent)', bg: 'var(--accent-soft)' }, teacher: { color: 'var(--info)', bg: 'var(--info-soft)' }, student: { color: 'var(--good)', bg: 'var(--good-soft)' } };

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState('all');
  const [error, setError] = useState('');
  const currentUser = useAuthStore((s) => s.user);

  const fetchUsers = useCallback(async () => {
    try {
      const params = filterRole !== 'all' ? { role: filterRole } : {};
      const { data } = await client.get('/admin/users', { params });
      setUsers(data.users);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [filterRole]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { if (error) { const t = setTimeout(() => setError(''), 4000); return () => clearTimeout(t); } }, [error]);

  const toggleActive = async (id) => {
    try { setError(''); await client.put(`/admin/users/${id}/toggle-active`); fetchUsers(); }
    catch (err) { setError(err?.response?.data?.error || 'Failed to update user status'); }
  };

  const isSelf = (id) => currentUser?.id === id;
  const roleCounts = { all: users.length, admin: users.filter(u => u.role === 'admin').length, teacher: users.filter(u => u.role === 'teacher').length, student: users.filter(u => u.role === 'student').length };

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg" /></div>;

  return (
    <div className="rd-content-inner">
      <PageHead title="Users" sub="Manage user accounts" />

      {error && (
        <div className="rd-card rd-card-pad fade-up" style={{ marginBottom: 'var(--gap)', background: 'var(--bad-soft)', borderColor: 'var(--bad)', color: 'var(--bad)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={16} /> {error}
          <button onClick={() => setError('')} style={{ marginLeft: 'auto', display: 'flex' }}><X size={16} /></button>
        </div>
      )}

      <div className="rd-toolbar">
        <div className="rd-seg">
          {ROLE_TABS.map(tab => (
            <button key={tab} className={filterRole === tab ? 'on' : ''} onClick={() => { setFilterRole(tab); setLoading(true); }}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{roleCounts[tab]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rd-card fade-up">
        <div className="rd-table-wrap">
          <table className="rd-tbl">
            <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Joined</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {users.map(u => {
                const rc = ROLE_COLORS[u.role] || { color: 'var(--muted)', bg: 'var(--surface-3)' };
                return (
                  <tr key={u.id}>
                    <td>
                      <div className="rd-cell-name">
                        <MiniAvatar name={u.name || 'User'} />
                        <div>
                          <div className="rd-name-main">
                            {u.name}
                            {isSelf(u.id) && <span className="rd-badge" style={{ color: 'var(--accent)', background: 'var(--accent-soft)', marginLeft: 8, fontSize: 11 }}>You</span>}
                          </div>
                          <div className="rd-name-sub">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="rd-badge" style={{ color: rc.color, background: rc.bg }}>{u.role}</span></td>
                    <td><StatusBadge status={u.isActive ? 'active' : 'inactive'} /></td>
                    <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{new Date(u.createdAt).toLocaleDateString()}</span></td>
                    <td style={{ textAlign: 'right' }}>
                      {isSelf(u.id) ? (
                        <span style={{ color: 'var(--faint)', fontSize: 13, fontStyle: 'italic' }}>—</span>
                      ) : (
                        <button className={`rd-btn rd-btn-sm ${u.isActive ? '' : 'rd-btn-primary'}`}
                          style={u.isActive ? { background: 'var(--bad-soft)', color: 'var(--bad)', border: 'none' } : {}}
                          onClick={() => toggleActive(u.id)}>
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
