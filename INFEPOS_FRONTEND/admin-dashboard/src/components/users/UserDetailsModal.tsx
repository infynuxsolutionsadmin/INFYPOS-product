import React, { useState, useEffect } from 'react';
import { X, User as UserIcon, Briefcase, ChevronUp } from 'lucide-react';
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
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"></div>
        </div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-[30px] text-left overflow-hidden shadow-[0px_8px_40px_rgba(0,0,0,0.08)] border border-gray-100 transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full relative z-10">
          <div className="bg-white px-6 pt-6 pb-2 sm:p-8 sm:pb-2">
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center flex-shrink-0">
                  <UserIcon className="h-5 w-5 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-[#1a1f36]">User Details</h3>
                {user && <UserStatusBadge status={user.status} />}
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            {loading ? (
              <div className="py-8 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : error ? (
              <div className="bg-red-50 p-4 text-red-600 rounded-xl text-sm">{error}</div>
            ) : user ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="bg-indigo-50/40 px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                         <UserIcon className="w-4 h-4" />
                       </div>
                       <h4 className="text-sm font-bold text-[#1a1f36]">Personal Information</h4>
                     </div>
                  </div>
                  <div className="p-4 sm:p-5 bg-white">
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
                      <div>
                        <dt className="text-xs font-medium text-gray-400 mb-1">First Name</dt>
                        <dd className="text-sm font-semibold text-[#1a1f36]">{user.firstName}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-gray-400 mb-1">Last Name</dt>
                        <dd className="text-sm font-semibold text-[#1a1f36]">{user.lastName || '—'}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-gray-400 mb-1">Email</dt>
                        <dd className="text-sm font-semibold text-indigo-600">{user.email}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-gray-400 mb-1">Phone</dt>
                        <dd className="text-sm font-semibold text-[#1a1f36]">{user.phone || '—'}</dd>
                      </div>
                    </dl>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="bg-orange-50/40 px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <h4 className="text-sm font-bold text-[#1a1f36]">Access &amp; Assignment</h4>
                    </div>
                    {/* <ChevronUp className="w-4 h-4 text-gray-400" /> */}
                  </div>
                  <div className="p-4 sm:p-5 bg-white">
                    <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-4">
                      <div>
                        <dt className="text-xs font-medium text-gray-400 mb-1">Role</dt>
                        <dd className="text-sm font-semibold text-[#1a1f36]">{user.role ? user.role.name : '—'}</dd>
                        {user.role && (
                          <div className="mt-2">
                            <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-blue-50 text-blue-700 uppercase tracking-wider">{user.role.code}</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-gray-400 mb-1">Store</dt>
                        <dd className="text-sm font-semibold text-[#1a1f36]">{user.store ? user.store.name : 'All Stores'}</dd>
                        {user.store && (
                          <div className="mt-2">
                            <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-purple-50 text-purple-700 uppercase tracking-wider">{user.store.code}</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-gray-400 mb-2">Status</dt>
                        <dd><UserStatusBadge status={user.status} /></dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-gray-400 mb-1">PIN Code</dt>
                        <dd className="text-sm font-mono font-bold tracking-widest text-[#1a1f36] bg-gray-50 px-2 py-1 rounded inline-block border border-gray-100">
                          {user.pinCode || '—'}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          <div className="px-6 py-4 sm:px-8 sm:pb-6 sm:flex sm:flex-row-reverse rounded-b-[30px] bg-white">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto inline-flex justify-center rounded-xl px-5 py-2 bg-slate-100 text-sm font-bold text-slate-700 hover:bg-slate-200 transition-colors focus:outline-none"
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
