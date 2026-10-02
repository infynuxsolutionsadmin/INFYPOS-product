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
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"></div>
        </div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-[30px] text-left overflow-hidden shadow-[0px_8px_40px_rgba(0,0,0,0.08)] border border-gray-100 transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl w-full relative z-10">
          <div className="bg-white px-6 pt-6 pb-6 sm:p-8 sm:pb-8">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-[#1a1f36]">
                {generatedPin ? 'User Created Successfully' : (isEdit ? 'Edit User' : 'Add New User')}
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
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">First Name *</label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Last Name</label>
                  <input
                    type="text"
                    maxLength={100}
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Email {!isCashier && '*'}</label>
                  <input
                    type="email"
                    required={!isCashier}
                    maxLength={255}
                    disabled={isEdit}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm disabled:opacity-50"
                  />
                  {isEdit && <p className="text-xs text-gray-400 mt-1">Email cannot be changed after creation.</p>}
                  {isCashier && !isEdit && <p className="text-xs text-gray-400 mt-1">Optional for Cashiers</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Phone</label>
                  <input
                    type="tel"
                    maxLength={20}
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Role *</label>
                  {dataLoading ? (
                    <div className="mt-1 py-2 text-sm text-gray-400">Loading roles...</div>
                  ) : (
                    <select
                      required
                      value={roleId}
                      onChange={e => setRoleId(e.target.value)}
                      className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm"
                    >
                      <option value="">Select a role</option>
                      {roles.map(r => (
                        <option key={r.id} value={r.id}>{r.name} ({r.code})</option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Store Assignment</label>
                  {dataLoading ? (
                    <div className="mt-1 py-2 text-sm text-gray-400">Loading stores...</div>
                  ) : (
                    <select
                      value={storeId}
                      onChange={e => setStoreId(e.target.value)}
                      className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm"
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
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Status</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                    className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              )}

              {!isEdit && !isCashier && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Password *</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      maxLength={100}
                      autoComplete="new-password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm"
                    />
                    <p className="text-xs text-gray-400 mt-1">Minimum 8 characters</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Confirm Password *</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      maxLength={100}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="block w-full border border-gray-200 bg-gray-50/50 rounded-2xl py-2.5 px-4 text-sm font-medium text-gray-800 focus:ring-[#5B58F2] focus:border-[#5B58F2] focus:bg-white transition-colors shadow-sm"
                    />
                  </div>
                </div>
              )}

              {!isEdit && isCashier && (
                <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl flex mt-4">
                  <p className="text-sm font-medium text-blue-700">
                    A secure, unique 4-digit PIN will be automatically generated for this cashier instead of a password.
                  </p>
                </div>
              )}

              <div className="bg-slate-50/50 px-4 py-4 sm:px-8 sm:flex sm:flex-row-reverse mt-8 -mx-6 sm:-mx-8 -mb-6 sm:-mb-8 rounded-b-[30px] border-t border-gray-100">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex justify-center rounded-full border border-transparent shadow-[0_4px_14px_0_rgba(99,102,241,0.39)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.23)] px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-base font-bold text-white hover:from-indigo-600 hover:to-purple-700 focus:outline-none hover:-translate-y-0.5 transition-all sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:pointer-events-none"
                >
                  {loading ? 'Saving...' : isEdit ? 'Update User' : 'Create User'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="mt-3 w-full inline-flex justify-center rounded-full border border-gray-200 shadow-sm px-6 py-2.5 bg-white text-base font-bold text-gray-700 hover:bg-gray-50 focus:outline-none hover:-translate-y-0.5 transition-all sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:pointer-events-none"
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
