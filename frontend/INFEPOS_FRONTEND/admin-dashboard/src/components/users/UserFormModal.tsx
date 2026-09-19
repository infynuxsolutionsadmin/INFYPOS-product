import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { User, CreateUserPayload, UpdateUserPayload, RoleOption, UserStatus } from '../../types/users';
import type { Store } from '../../types/stores';
import { createUser, updateUser, getRoles } from '../../api/users.api';
import { getStores } from '../../api/stores.api';

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user?: User | null;
}

const UserFormModal: React.FC<UserFormModalProps> = ({ isOpen, onClose, onSuccess, user }) => {
  const isEdit = !!user;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [roleId, setRoleId] = useState('');
  const [storeId, setStoreId] = useState('');
  const [status, setStatus] = useState<UserStatus>('ACTIVE');
  // Password only for create
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError(null);
      // Populate form
      if (user) {
        setFirstName(user.firstName);
        setLastName(user.lastName || '');
        setEmail(user.email);
        setPhone(user.phone || '');
        setRoleId(user.roleId);
        setStoreId(user.storeId || '');
        setStatus(user.status);
      } else {
        setFirstName('');
        setLastName('');
        setEmail('');
        setPhone('');
        setRoleId('');
        setStoreId('');
        setStatus('ACTIVE');
        setPassword('');
        setConfirmPassword('');
      }
      // Load roles and stores for dropdowns
      setDataLoading(true);
      Promise.all([
        getRoles().catch(() => [] as RoleOption[]),
        getStores({ limit: 100 }).catch(() => ({ items: [] as Store[], pagination: { page: 1, limit: 100, total: 0, pages: 0 } })),
      ]).then(([rolesData, storesData]) => {
        setRoles(rolesData);
        setStores(storesData.items);
      }).finally(() => setDataLoading(false));
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isEdit) {
      if (password.length < 8) {
        setError('Password must be at least 8 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setLoading(true);
    try {
      if (isEdit) {
        const payload: UpdateUserPayload = {};
        if (firstName !== user!.firstName) payload.firstName = firstName;
        if (lastName !== (user!.lastName || '')) payload.lastName = lastName || undefined;
        if (phone !== (user!.phone || '')) payload.phone = phone || undefined;
        if (roleId !== user!.roleId) payload.roleId = roleId;
        if (storeId !== (user!.storeId || '')) payload.storeId = storeId || null;
        if (status !== user!.status) payload.status = status;
        await updateUser(user!.id, payload);
      } else {
        const payload: CreateUserPayload = {
          firstName,
          email,
          roleId,
          password,
        };
        if (lastName) payload.lastName = lastName;
        if (phone) payload.phone = phone;
        if (storeId) payload.storeId = storeId;
        await createUser(payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'An error occurred';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl w-full relative z-10">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-center mb-5 border-b pb-3">
              <h3 className="text-lg font-medium text-gray-900">
                {isEdit ? 'Edit User' : 'Add New User'}
              </h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                <X className="h-6 w-6" />
              </button>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">First Name *</label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Name</label>
                  <input
                    type="text"
                    maxLength={100}
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email *</label>
                  <input
                    type="email"
                    required
                    maxLength={255}
                    disabled={isEdit}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                  />
                  {isEdit && <p className="text-xs text-gray-400 mt-1">Email cannot be changed after creation.</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <input
                    type="tel"
                    maxLength={20}
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role *</label>
                  {dataLoading ? (
                    <div className="mt-1 py-2 text-sm text-gray-400">Loading roles...</div>
                  ) : (
                    <select
                      required
                      value={roleId}
                      onChange={e => setRoleId(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select a role</option>
                      {roles.map(r => (
                        <option key={r.id} value={r.id}>{r.name} ({r.code})</option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Store Assignment</label>
                  {dataLoading ? (
                    <div className="mt-1 py-2 text-sm text-gray-400">Loading stores...</div>
                  ) : (
                    <select
                      value={storeId}
                      onChange={e => setStoreId(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Stores (no specific store)</option>
                      {stores.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {isEdit && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              )}

              {!isEdit && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Password *</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      maxLength={100}
                      autoComplete="new-password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">Minimum 8 characters</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Confirm Password *</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      maxLength={100}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              <div className="bg-gray-50 px-4 py-3 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 rounded-b-lg border-t flex flex-row-reverse gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:text-sm disabled:opacity-50"
                >
                  {loading ? 'Saving...' : isEdit ? 'Update User' : 'Create User'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:text-sm disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserFormModal;
