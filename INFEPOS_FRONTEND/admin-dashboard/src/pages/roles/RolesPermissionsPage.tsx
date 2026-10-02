import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Eye, Edit, Trash2, Search, Shield } from 'lucide-react';
import type { Role, FindRolesQuery, RoleStatus } from '../../types/roles';
import { getRoles, getRoleById } from '../../api/roles.api';
import { useAuthStore } from '../../stores/authStore';
import RoleStatusBadge from '../../components/roles/RoleStatusBadge';
import RoleDetailsModal from '../../components/roles/RoleDetailsModal';
import RoleFormModal from '../../components/roles/RoleFormModal';
import DeleteRoleConfirmModal from '../../components/roles/DeleteRoleConfirmModal';
import PermissionAssignmentModal from '../../components/roles/PermissionAssignmentModal';

const RolesPermissionsPage: React.FC = () => {
  const { hasPermission } = useAuthStore();
  const canRead = hasPermission('roles.read');
  const canCreate = hasPermission('roles.create');
  const canUpdate = hasPermission('roles.update');
  const canDelete = hasPermission('roles.delete');

  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState<FindRolesQuery>({
    page: 1, limit: 10, search: '', status: undefined,
  });
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Modal state
  const [detailsRoleId, setDetailsRoleId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPermOpen, setIsPermOpen] = useState(false);

  const [formRole, setFormRole] = useState<Role | null>(null);
  const [deleteRole, setDeleteRole] = useState<Role | null>(null);
  // For permission modal we need the full role (with permissions included from findOne)
  const [permRole, setPermRole] = useState<Role | null>(null);
  const [permLoading, setPermLoading] = useState(false);

  const fetchRoles = useCallback(async () => {
    if (!canRead) { setLoading(false); setError('You do not have permission to view roles.'); return; }
    try {
      setLoading(true); setError(null);
      const params: FindRolesQuery = {};
      if (query.page) params.page = query.page;
      if (query.limit) params.limit = query.limit;
      if (query.search) params.search = query.search;
      if (query.status) params.status = query.status;
      const data = await getRoles(params);
      setRoles(data.items);
      setTotalPages(data.pagination.pages);
      setTotalItems(data.pagination.total);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch roles');
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }, [query, canRead]);

  useEffect(() => {
    const timer = setTimeout(fetchRoles, 300);
    return () => clearTimeout(timer);
  }, [fetchRoles]);

  const openPermissions = async (role: Role) => {
    setPermLoading(true);
    try {
      // Fetch full role with permissions (findOne includes them)
      const full = await getRoleById(role.id);
      setPermRole(full);
      setIsPermOpen(true);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load role');
    } finally {
      setPermLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pb-12">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1f36]">Roles &amp; Permissions</h1>
          <p className="mt-1 text-sm text-gray-500">Manage roles and control access permissions.</p>
        </div>
        {canCreate && (
          <button
            onClick={() => { setFormRole(null); setIsFormOpen(true); }}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-2xl text-white bg-[#5B58F2] hover:bg-[#4A47E5]"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            Add Role
          </button>
        )}
      </div>

      <div className="bg-white rounded-[24px] shadow-[0px_4px_24px_rgba(149,157,165,0.12)] border border-gray-100 overflow-hidden mb-6">
        {/* Filters */}
        <div className="px-4 py-4 sm:px-6 border-b border-gray-200 flex flex-col sm:flex-row gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text" value={query.search || ''}
              onChange={e => setQuery(prev => ({ ...prev, search: e.target.value, page: 1 }))}
              placeholder="Search by name or code..."
              className="block w-full pl-11 pr-4 py-2.5 text-sm border border-gray-200 rounded-full focus:ring-2 focus:ring-[#5B58F2] focus:border-transparent outline-none transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-white text-gray-800 placeholder-gray-400"
            />
          </div>
          <div className="w-full sm:w-40">
            <select
              value={query.status || ''}
              onChange={e => {
                const val = e.target.value;
                setQuery(prev => ({ ...prev, status: val ? (val as RoleStatus) : undefined, page: 1 }));
              }}
              className="block w-full pl-4 pr-10 py-2.5 text-sm border border-gray-200 rounded-full focus:ring-2 focus:ring-[#5B58F2] focus:border-transparent outline-none transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-white text-gray-800 cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[30px] shadow-[0px_4px_24px_rgba(149,157,165,0.08)] border border-gray-100 p-6 overflow-hidden">
        {error ? (
          <div className="p-4 text-red-500 text-center">{error}</div>
        ) : loading ? (
          <div className="p-10 flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#5B58F2]"></div>
          </div>
        ) : roles.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            <Shield className="h-10 w-10 mx-auto text-gray-300 mb-3" />
            <p>No roles found.</p>
            {canCreate && (
              <button onClick={() => { setFormRole(null); setIsFormOpen(true); }}
                className="mt-4 inline-flex items-center px-6 py-2.5 border border-transparent shadow-[0_4px_14px_0_rgba(99,102,241,0.39)] text-sm font-bold rounded-full text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:-translate-y-0.5 transition-all"
              >
                Add Role
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-visible pb-4">
            <table className="min-w-full border-separate" style={{ borderSpacing: '0 12px' }}>
              <thead>
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-[#f8f9fc] first:rounded-l-[16px] last:rounded-r-[16px]">Name</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-[#f8f9fc] first:rounded-l-[16px] last:rounded-r-[16px]">Code</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-[#f8f9fc] first:rounded-l-[16px] last:rounded-r-[16px]">Description</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">System</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-[#f8f9fc] first:rounded-l-[16px] last:rounded-r-[16px]">Created</th>
                  <th className="px-6 py-4 relative bg-[#f8f9fc] first:rounded-l-[16px] last:rounded-r-[16px]"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {roles.map(role => (
                  <tr key={role.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap bg-white border-y border-gray-100 first:border-l first:rounded-l-[24px] last:border-r last:rounded-r-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow">
                      <div className="text-sm font-semibold text-gray-900">{role.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap bg-white border-y border-gray-100 first:border-l first:rounded-l-[24px] last:border-r last:rounded-r-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700">{role.code}</code>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500 max-w-xs truncate">{role.description || '—'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {role.isSystem ? (
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-700">System</span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <RoleStatusBadge status={role.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500 bg-white border-y border-gray-100 first:border-l first:rounded-l-[24px] last:border-r last:rounded-r-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow">
                      {new Date(role.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                      <button
                        onClick={() => { setDetailsRoleId(role.id); setIsDetailsOpen(true); }}
                        className="text-gray-500 hover:text-[#5B58F2]" title="View Details"
                      >
                        <Eye className="h-5 w-5 inline" />
                      </button>
                      <button
                        onClick={() => openPermissions(role)}
                        disabled={permLoading}
                        className="text-gray-500 hover:text-indigo-600 disabled:opacity-40"
                        title="Manage Permissions"
                      >
                        <Shield className="h-5 w-5 inline" />
                      </button>
                      {canUpdate && (
                        <button
                          onClick={() => { setFormRole(role); setIsFormOpen(true); }}
                          className="text-gray-500 hover:text-green-600" title="Edit"
                        >
                          <Edit className="h-5 w-5 inline" />
                        </button>
                      )}
                      {canDelete && role.status === 'ACTIVE' && !role.isSystem && (
                        <button
                          onClick={() => { setDeleteRole(role); setIsDeleteOpen(true); }}
                          className="text-red-500 hover:text-red-700" title="Deactivate"
                        >
                          <Trash2 className="h-5 w-5 inline" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-gray-700 hidden sm:block">
                  Showing <span className="font-bold text-[#1a1f36]">{((query.page || 1) - 1) * (query.limit || 10) + 1}</span> to{' '}
                  <span className="font-bold text-[#1a1f36]">{Math.min((query.page || 1) * (query.limit || 10), totalItems)}</span> of{' '}
                  <span className="font-bold text-[#1a1f36]">{totalItems}</span> results
                </p>
                <nav className="relative z-0 inline-flex rounded-2xl shadow-sm -space-x-px">
                  <button onClick={() => setQuery(prev => ({ ...prev, page: (prev.page || 1) - 1 }))}
                    disabled={(query.page || 1) <= 1}
                    className="relative inline-flex items-center px-3 py-2 rounded-l-md  bg-white text-sm font-medium text-gray-500 hover:bg-slate-50/50 disabled:opacity-50"
                  >Previous</button>
                  <button onClick={() => setQuery(prev => ({ ...prev, page: (prev.page || 1) + 1 }))}
                    disabled={(query.page || 1) >= totalPages}
                    className="relative inline-flex items-center px-3 py-2 rounded-r-md  bg-white text-sm font-medium text-gray-500 hover:bg-slate-50/50 disabled:opacity-50"
                  >Next</button>
                </nav>
              </div>
            )}
          </div>
        )}
      </div>

      <RoleDetailsModal isOpen={isDetailsOpen} onClose={() => setIsDetailsOpen(false)} roleId={detailsRoleId} />
      <RoleFormModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSuccess={fetchRoles} role={formRole} />
      <DeleteRoleConfirmModal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} onSuccess={fetchRoles} role={deleteRole} />
      <PermissionAssignmentModal
        isOpen={isPermOpen}
        onClose={() => setIsPermOpen(false)}
        onSuccess={fetchRoles}
        role={permRole}
      />
    </div>
  );
};

export default RolesPermissionsPage;

// <!-- fixed -->
