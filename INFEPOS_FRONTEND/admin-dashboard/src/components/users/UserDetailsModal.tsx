import React, { useState, useEffect } from 'react';
import { X, User as UserIcon } from 'lucide-react';
import type { User } from '../../types/users';
import { getUserById } from '../../api/users.api';
import UserStatusBadge from './UserStatusBadge';

interface UserDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
}

const UserDetailsModal: React.FC<UserDetailsModalProps> = ({ isOpen, onClose, userId }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && userId) {
      setLoading(true);
      setError(null);
      getUserById(userId)
        .then(setUser)
        .catch(err => setError(err.response?.data?.message || err.message || 'Failed to load user'))
        .finally(() => setLoading(false));
    } else {
      setUser(null);
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full relative z-10">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-center mb-5 border-b pb-3">
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <UserIcon className="h-5 w-5 text-gray-500" />
                User Details
                {user && <UserStatusBadge status={user.status} />}
              </h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                <X className="h-6 w-6" />
              </button>
            </div>

            {loading ? (
              <div className="py-8 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="bg-red-50 p-4 text-red-600 rounded text-sm">{error}</div>
            ) : user ? (
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <h4 className="text-sm font-bold text-gray-900 border-b pb-2 mb-3">Personal Information</h4>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <div>
                      <dt className="text-xs font-medium text-gray-500">First Name</dt>
                      <dd className="mt-1 text-sm text-gray-900">{user.firstName}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-gray-500">Last Name</dt>
                      <dd className="mt-1 text-sm text-gray-900">{user.lastName || '—'}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-xs font-medium text-gray-500">Email</dt>
                      <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-gray-500">Phone</dt>
                      <dd className="mt-1 text-sm text-gray-900">{user.phone || '—'}</dd>
                    </div>
                  </dl>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border">
                  <h4 className="text-sm font-bold text-gray-900 border-b pb-2 mb-3">Access &amp; Assignment</h4>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <div>
                      <dt className="text-xs font-medium text-gray-500">Role</dt>
                      <dd className="mt-1 text-sm text-gray-900 font-medium">
                        {user.role ? `${user.role.name}` : '—'}
                      </dd>
                      {user.role && (
                        <dd className="text-xs text-gray-400">{user.role.code}</dd>
                      )}
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-gray-500">Store</dt>
                      <dd className="mt-1 text-sm text-gray-900">{user.store ? user.store.name : 'All Stores'}</dd>
                      {user.store && <dd className="text-xs text-gray-400">{user.store.code}</dd>}
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-gray-500">Status</dt>
                      <dd className="mt-1"><UserStatusBadge status={user.status} /></dd>
                    </div>
                  </dl>
                </div>
              </div>
            ) : null}
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={onClose}
              className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetailsModal;
