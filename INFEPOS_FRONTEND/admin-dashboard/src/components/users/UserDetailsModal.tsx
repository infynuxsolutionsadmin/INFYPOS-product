import React, { useState, useEffect } from 'react';
import { X, User as UserIcon, Briefcase, RotateCcw, KeyRound, Copy, Check, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import type { User } from '../../types/users';
import { getUserById, resetUserPin } from '../../api/users.api';
import { useAuthStore } from '../../stores/authStore';
import UserStatusBadge from './UserStatusBadge';

interface UserDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
}

const UserDetailsModal: React.FC<UserDetailsModalProps> = ({ isOpen, onClose, userId }) => {
  const { user: currentUser, hasPermission } = useAuthStore();
  const isAdmin = currentUser?.roleCode === 'SUPER_ADMIN' || currentUser?.roleCode === 'OWNER' || hasPermission('users.update');

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showPlainPin, setShowPlainPin] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [revealedPin, setRevealedPin] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleClose = () => {
    setShowResetConfirm(false);
    setRevealedPin(null);
    setResetError(null);
    setCopied(false);
    setShowPlainPin(false);
    onClose();
  };

  const handleConfirmReset = async () => {
    if (!user) return;
    setResetting(true);
    setResetError(null);
    try {
      const res = await resetUserPin(user.id);
      setUser(prev => prev ? { ...prev, hasPin: true, pinCode: res.generatedPin } : null);
      setShowResetConfirm(false);
      setRevealedPin(res.generatedPin);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to reset PIN';
      setResetError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setResetting(false);
    }
  };

  const handleCopyPin = async () => {
    if (!revealedPin) return;
    try {
      await navigator.clipboard.writeText(revealedPin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback clipboard ignore
    }
  };

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
        <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={handleClose}>
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
              <button onClick={handleClose} className="text-gray-400 hover:text-gray-500">
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
                    <dl className="grid grid-cols-2 sm:grid-cols-2 gap-x-4 gap-y-4">
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
                      {isAdmin && (
                        <div>
                          <dt className="text-xs font-medium text-gray-400 mb-1">PIN Code</dt>
                          {user.role?.code === 'CASHIER' ? (
                            <dd className="flex flex-col items-start gap-2">
                              {Boolean(user.hasPin || user.pinCode) ? (
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1">
                                    <span className="font-mono text-sm font-bold tracking-widest text-[#1a1f36] select-all">
                                      {showPlainPin && user.pinCode ? user.pinCode : '••••'}
                                    </span>
                                    {user.pinCode && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => setShowPlainPin(!showPlainPin)}
                                          className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-200/60 transition-colors focus:outline-none cursor-pointer"
                                          title={showPlainPin ? 'Hide PIN' : 'Show PIN'}
                                        >
                                          {showPlainPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (user.pinCode) {
                                              navigator.clipboard.writeText(user.pinCode);
                                              setCopied(true);
                                              setTimeout(() => setCopied(false), 2000);
                                            }
                                          }}
                                          className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-200/60 transition-colors focus:outline-none cursor-pointer"
                                          title="Copy PIN"
                                        >
                                          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                        </button>
                                      </>
                                    )}
                                  </div>
                                  <div>
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                      Configured
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200/60">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                  Not Configured
                                </span>
                              )}
                              {currentUser?.id !== user.id && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setResetError(null);
                                    setShowResetConfirm(true);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-100 focus:outline-none cursor-pointer"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  Reset PIN
                                </button>
                              )}
                            </dd>
                          ) : (
                            <dd className="text-sm font-semibold text-gray-400">—</dd>
                          )}
                        </div>
                      )}
                    </dl>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          <div className="px-6 py-4 sm:px-8 sm:pb-6 sm:flex sm:flex-row-reverse rounded-b-[30px] bg-white">
            <button
              type="button"
              onClick={handleClose}
              className="w-full sm:w-auto inline-flex justify-center rounded-xl px-5 py-2 bg-slate-100 text-sm font-bold text-slate-700 hover:bg-slate-200 transition-colors focus:outline-none"
            >
              Close
            </button>
          </div>

          {/* Explicit Confirmation Modal */}
          {showResetConfirm && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
              <div className="bg-white rounded-[24px] max-w-sm w-full p-6 shadow-2xl border border-gray-100 relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-[#1a1f36]">Reset Cashier PIN</h4>
                    <p className="text-xs text-gray-500">Explicit confirmation required</p>
                  </div>
                </div>

                <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                  Are you sure you want to reset the PIN for <strong className="text-gray-900">{user?.firstName} {user?.lastName || ''}</strong>?
                  A new 4-digit PIN will be generated and any active cashier sessions will be invalidated immediately.
                </p>

                {resetError && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl p-3">
                    {resetError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2.5 mt-5">
                  <button
                    type="button"
                    disabled={resetting}
                    onClick={() => {
                      setShowResetConfirm(false);
                      setResetError(null);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={resetting}
                    onClick={handleConfirmReset}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {resetting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Resetting...
                      </>
                    ) : (
                      'Confirm & Reset'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Secure One-Time Reveal Modal */}
          {revealedPin && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
              <div className="bg-white rounded-[24px] max-w-sm w-full p-6 shadow-2xl border border-gray-100 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-4">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold text-[#1a1f36] mb-1">New PIN Generated</h4>
                <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                  Communicate this 4-digit PIN securely to the cashier. For security, this PIN is shown only once.
                </p>

                <div className="bg-gray-50 border border-gray-200/80 rounded-2xl p-4 mb-3 flex flex-col items-center justify-center">
                  <div className="text-3xl font-mono font-bold tracking-[0.3em] text-[#1a1f36] select-all mb-3">
                    {revealedPin}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyPin}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-gray-200 shadow-xs hover:bg-gray-50 text-gray-700 transition-colors cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-gray-500" />
                        <span>Copy PIN</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-amber-50 border border-amber-200/70 text-amber-800 text-[11px] rounded-xl p-3 mb-4 text-left leading-relaxed">
                  <strong>Security Notice:</strong> This PIN is never stored in plaintext and cannot be displayed again.
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setRevealedPin(null);
                    setCopied(false);
                  }}
                  className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors cursor-pointer"
                >
                  I Have Recorded This PIN
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserDetailsModal;
