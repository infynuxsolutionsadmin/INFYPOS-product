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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Roles &amp; Permissions</h1>
          <p className="mt-1 text-sm text-gray-500">Manage roles and control access permissions.</p>
        </div>
        {canCreate && (
          <button
            onClick={() => { setFormRole(null); setIsFormOpen(true); }}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            Add Role
          </button>
        )}
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {/* Filters */}
        <div className="px-4 py-4 sm:px-6 border-b border-gray-200 flex flex-col sm:flex-row gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text" value={query.search || ''}
              onChange={e => setQuery(prev => ({ ...prev, search: e.target.value, page: 1 }))}
              placeholder="Search by name or code..."
              className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="w-full sm:w-40">
            <select
              value={query.status || ''}
              onChange={e => {
                const val = e.target.value;
                setQuery(prev => ({ ...prev, status: val ? (val as RoleStatus) : undefined, page: 1 }));
              }}
              className="block w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md border"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>

        {error ? (
          <div className="p-4 text-red-500 text-center">{error}</div>
        ) : loading ? (
          <div className="p-10 flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : roles.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            <Shield className="h-10 w-10 mx-auto text-gray-300 mb-3" />
            <p>No roles found.</p>
            {canCreate && (
              <button onClick={() => { setFormRole(null); setIsFormOpen(true); }}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Add Role
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">System</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {roles.map(role => (
                  <tr key={role.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">{role.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(role.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                      <button
                        onClick={() => { setDetailsRoleId(role.id); setIsDetailsOpen(true); }}
                        className="text-gray-500 hover:text-blue-600" title="View Details"
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
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <p className="text-sm text-gray-700 hidden sm:block">
                  Showing <span className="font-medium">{((query.page || 1) - 1) * (query.limit || 10) + 1}</span> to{' '}
                  <span className="font-medium">{Math.min((query.page || 1) * (query.limit || 10), totalItems)}</span> of{' '}
                  <span className="font-medium">{totalItems}</span> results
                </p>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button onClick={() => setQuery(prev => ({ ...prev, page: (prev.page || 1) - 1 }))}
                    disabled={(query.page || 1) <= 1}
                    className="relative inline-flex items-center px-3 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >Previous</button>
                  <button onClick={() => setQuery(prev => ({ ...prev, page: (prev.page || 1) + 1 }))}
                    disabled={(query.page || 1) >= totalPages}
                    className="relative inline-flex items-center px-3 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
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
