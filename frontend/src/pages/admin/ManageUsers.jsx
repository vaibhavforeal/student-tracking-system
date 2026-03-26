import { useState, useEffect } from 'react';
import client from '../../api/client';

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState('');

  const fetchUsers = async () => {
    try {
      const { data } = await client.get('/admin/users', { params: filterRole ? { role: filterRole } : {} });
      setUsers(data.users);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, [filterRole]);

  const toggleActive = async (id) => {
    await client.put(`/admin/users/${id}/toggle-active`);
    fetchUsers();
  };

  const roleColor = { admin: 'badge-purple', teacher: 'badge-sky', student: 'badge-green' };

  if (loading) return <div className="loading-container"><div className="spinner spinner-lg" /></div>;

  return (
    <div>
      <div className="page-header">
        <div><h1>Users</h1><p className="page-subtitle">Manage user accounts</p></div>
      </div>

      <div className="toolbar">
        <div className="filter-group">
          <select className="form-select" value={filterRole} onChange={(e) => setFilterRole(e.target.value)} style={{ width: 'auto' }}>
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
          </select>
        </div>
      </div>

      <div className="card">
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 500 }}>{u.name}</td>
                  <td>{u.email}</td>
                  <td><span className={`badge ${roleColor[u.role] || 'badge-gray'}`}>{u.role}</span></td>
                  <td><span className={`badge ${u.isActive ? 'badge-green' : 'badge-red'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button className={`btn btn-sm ${u.isActive ? 'btn-danger' : 'btn-primary'}`}
                      onClick={() => toggleActive(u.id)}>
                      {u.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
