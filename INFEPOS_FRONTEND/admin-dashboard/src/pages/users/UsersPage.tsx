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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pb-12">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1f36]">Users</h1>
          <p className="mt-1 text-sm text-gray-500">Manage users and their access within the organization.</p>
        </div>
        {canCreate && (
          <button
            onClick={() => { setSelectedUser(null); setIsFormOpen(true); }}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-2xl text-white bg-[#5B58F2] hover:bg-[#4A47E5]"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            Add User
          </button>
        )}
      </div>

      <div className="bg-white rounded-[24px] shadow-[0px_4px_24px_rgba(149,157,165,0.12)] border border-gray-100 overflow-hidden mb-6">
        {/* Filters */}
        <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={query.search || ''}
              onChange={handleSearchChange}
              placeholder="Search by name or email..."
              className="block w-full pl-11 pr-4 py-2.5 text-sm border border-gray-200 rounded-full focus:ring-2 focus:ring-[#5B58F2] focus:border-transparent outline-none transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-white text-gray-800 placeholder-gray-400"
            />
          </div>
          <div className="w-full sm:w-40">
            <select
              value={query.status || ''}
              onChange={handleStatusChange}
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
        ) : users.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            <p>No users found.</p>
            {canCreate && (
              <button
                onClick={() => { setSelectedUser(null); setIsFormOpen(true); }}
                className="mt-4 inline-flex items-center px-6 py-2.5 border border-transparent shadow-[0_4px_14px_0_rgba(99,102,241,0.39)] text-sm font-bold rounded-full text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:-translate-y-0.5 transition-all"
              >
                Add User
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-visible pb-4">
            <table className="min-w-full border-separate" style={{ borderSpacing: '0 12px' }}>
              <thead>
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-[#f8f9fc] first:rounded-l-[16px] last:rounded-r-[16px]">Name</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-[#f8f9fc] first:rounded-l-[16px] last:rounded-r-[16px]">Email</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-[#f8f9fc] first:rounded-l-[16px] last:rounded-r-[16px]">Phone</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-[#f8f9fc] first:rounded-l-[16px] last:rounded-r-[16px]">Role</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider bg-[#f8f9fc] first:rounded-l-[16px] last:rounded-r-[16px]">Store</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 relative bg-[#f8f9fc] first:rounded-l-[16px] last:rounded-r-[16px]"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap bg-white border-y border-gray-100 first:border-l first:rounded-l-[24px] last:border-r last:rounded-r-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow">
                      <div className="text-sm font-bold text-[#1a1f36]">
                        {u.firstName} {u.lastName}
                        {currentUser && u.id === (currentUser as any).id && (
                          <span className="ml-2 px-1.5 py-0.5 text-xs rounded bg-blue-100 text-blue-700">You</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{u.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500 bg-white border-y border-gray-100 first:border-l first:rounded-l-[24px] last:border-r last:rounded-r-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow">{u.phone || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap bg-white border-y border-gray-100 first:border-l first:rounded-l-[24px] last:border-r last:rounded-r-[24px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow">
                      <div className="text-sm font-bold text-[#1a1f36]">{u.role?.name || '—'}</div>
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
                        className="text-gray-500 hover:text-[#5B58F2]"
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
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-gray-700 hidden sm:block">
                  Showing <span className="font-bold text-[#1a1f36]">{((query.page || 1) - 1) * (query.limit || 10) + 1}</span> to{' '}
                  <span className="font-bold text-[#1a1f36]">{Math.min((query.page || 1) * (query.limit || 10), totalItems)}</span> of{' '}
                  <span className="font-bold text-[#1a1f36]">{totalItems}</span> results
                </p>
                <nav className="relative z-0 inline-flex rounded-2xl shadow-sm -space-x-px">
                  <button
                    onClick={() => handlePageChange((query.page || 1) - 1)}
                    disabled={(query.page || 1) <= 1}
                    className="relative inline-flex items-center px-3 py-2 rounded-l-md  bg-white text-sm font-medium text-gray-500 hover:bg-slate-50/50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange((query.page || 1) + 1)}
                    disabled={(query.page || 1) >= totalPages}
                    className="relative inline-flex items-center px-3 py-2 rounded-r-md  bg-white text-sm font-medium text-gray-500 hover:bg-slate-50/50 disabled:opacity-50"
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

// <!-- fixed -->
