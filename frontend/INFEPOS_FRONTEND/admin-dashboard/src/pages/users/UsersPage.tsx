import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Eye, Edit, Trash2, Search } from 'lucide-react';
import type { User, FindUsersQuery, UserStatus } from '../../types/users';
import { getUsers } from '../../api/users.api';
import { useAuthStore } from '../../stores/authStore';
import UserStatusBadge from '../../components/users/UserStatusBadge';
import UserDetailsModal from '../../components/users/UserDetailsModal';
import UserFormModal from '../../components/users/UserFormModal';
import DeleteUserConfirmModal from '../../components/users/DeleteUserConfirmModal';

const UsersPage: React.FC = () => {
  const { hasPermission, user: currentUser } = useAuthStore();
  const canRead = hasPermission('users.read');
  const canCreate = hasPermission('users.create');
  const canUpdate = hasPermission('users.update');
  const canDelete = hasPermission('users.delete');

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState<FindUsersQuery>({
    page: 1,
    limit: 10,
    search: '',
    status: undefined,
  });
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const fetchUsers = useCallback(async () => {
    if (!canRead) {
      setLoading(false);
      setError('You do not have permission to view users.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const params: FindUsersQuery = {};
      if (query.page) params.page = query.page;
      if (query.limit) params.limit = query.limit;
      if (query.search) params.search = query.search;
      if (query.status) params.status = query.status;
      const data = await getUsers(params);
      setUsers(data.items);
      setTotalPages(data.pagination.pages);
      setTotalItems(data.pagination.total);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [query, canRead]);

  useEffect(() => {
    const timer = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(prev => ({ ...prev, search: e.target.value, page: 1 }));
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setQuery(prev => ({ ...prev, status: val ? (val as UserStatus) : undefined, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setQuery(prev => ({ ...prev, page: newPage }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
          <p className="mt-1 text-sm text-gray-500">Manage users and their access within the organization.</p>
        </div>
        {canCreate && (
          <button
            onClick={() => { setSelectedUser(null); setIsFormOpen(true); }}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            Add User
          </button>
        )}
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {/* Filters */}
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex flex-col sm:flex-row gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={query.search || ''}
              onChange={handleSearchChange}
              placeholder="Search by name or email..."
              className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="w-full sm:w-40">
            <select
              value={query.status || ''}
              onChange={handleStatusChange}
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
        ) : users.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            <p>No users found.</p>
            {canCreate && (
              <button
                onClick={() => { setSelectedUser(null); setIsFormOpen(true); }}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Add User
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Store</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {u.firstName} {u.lastName}
                        {currentUser && u.id === (currentUser as any).id && (
                          <span className="ml-2 px-1.5 py-0.5 text-xs rounded bg-blue-100 text-blue-700">You</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{u.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.phone || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{u.role?.name || '—'}</div>
                      {u.role && <div className="text-xs text-gray-400">{u.role.code}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {u.store ? u.store.name : <span className="text-gray-400">All Stores</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <UserStatusBadge status={u.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                      <button
                        onClick={() => { setSelectedUserId(u.id); setIsDetailsOpen(true); }}
                        className="text-gray-500 hover:text-blue-600"
                        title="View Details"
                      >
                        <Eye className="h-5 w-5 inline" />
                      </button>
                      {canUpdate && (
                        <button
                          onClick={() => { setSelectedUser(u); setIsFormOpen(true); }}
                          className="text-gray-500 hover:text-green-600"
                          title="Edit"
                        >
                          <Edit className="h-5 w-5 inline" />
                        </button>
                      )}
                      {canDelete && u.status === 'ACTIVE' && (
                        <button
                          onClick={() => { setSelectedUser(u); setIsDeleteOpen(true); }}
                          className="text-red-500 hover:text-red-700"
                          title="Deactivate"
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
                  <button
                    onClick={() => handlePageChange((query.page || 1) - 1)}
                    disabled={(query.page || 1) <= 1}
                    className="relative inline-flex items-center px-3 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange((query.page || 1) + 1)}
                    disabled={(query.page || 1) >= totalPages}
                    className="relative inline-flex items-center px-3 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            )}
          </div>
        )}
      </div>

      <UserDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        userId={selectedUserId}
      />
      <UserFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={fetchUsers}
        user={selectedUser}
      />
      <DeleteUserConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onSuccess={fetchUsers}
        user={selectedUser}
      />
    </div>
  );
};

export default UsersPage;
