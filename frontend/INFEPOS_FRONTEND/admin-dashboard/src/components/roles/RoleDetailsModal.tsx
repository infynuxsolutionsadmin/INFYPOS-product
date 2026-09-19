import React, { useState, useEffect } from 'react';
import { X, Shield } from 'lucide-react';
import type { Role } from '../../types/roles';
import { getRoleById } from '../../api/roles.api';
import RoleStatusBadge from './RoleStatusBadge';

interface RoleDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  roleId: string | null;
}

const RoleDetailsModal: React.FC<RoleDetailsModalProps> = ({ isOpen, onClose, roleId }) => {
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && roleId) {
      setLoading(true);
      setError(null);
      getRoleById(roleId)
        .then(setRole)
        .catch(err => setError(err.response?.data?.message || err.message || 'Failed to load role'))
        .finally(() => setLoading(false));
    } else {
      setRole(null);
    }
  }, [isOpen, roleId]);

  if (!isOpen) return null;

  // Group assigned permissions by module
  const grouped = (role?.permissions ?? []).reduce<Record<string, string[]>>((acc, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p.code);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl w-full relative z-10">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <Shield className="h-5 w-5 text-gray-500" />
                Role Details
                {role && <RoleStatusBadge status={role.status} />}
                {role?.isSystem && (
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">System</span>
                )}
              </h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500"><X className="h-6 w-6" /></button>
            </div>

            {loading ? (
              <div className="py-8 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="bg-red-50 p-4 text-red-600 rounded text-sm">{error}</div>
            ) : role ? (
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <div>
                      <dt className="text-xs font-medium text-gray-500">Name</dt>
                      <dd className="mt-1 text-sm font-bold text-gray-900">{role.name}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-gray-500">Code</dt>
                      <dd className="mt-1 text-sm font-mono text-gray-900">{role.code}</dd>
                    </div>
                    {role.description && (
                      <div className="col-span-2">
                        <dt className="text-xs font-medium text-gray-500">Description</dt>
                        <dd className="mt-1 text-sm text-gray-700">{role.description}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-xs font-medium text-gray-500">Created</dt>
                      <dd className="mt-1 text-sm text-gray-900">{new Date(role.createdAt).toLocaleDateString()}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-gray-500">Last Updated</dt>
                      <dd className="mt-1 text-sm text-gray-900">{new Date(role.updatedAt).toLocaleDateString()}</dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">
                    Assigned Permissions ({role.permissions?.length ?? 0})
                  </h4>
                  {Object.keys(grouped).length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No permissions assigned.</p>
                  ) : (
                    <div className="space-y-3 max-h-72 overflow-y-auto">
                      {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([module, codes]) => (
                        <div key={module} className="border border-gray-200 rounded-lg overflow-hidden">
                          <div className="bg-gray-50 px-3 py-1.5 border-b">
                            <span className="text-xs font-bold text-gray-700 uppercase">{module}</span>
                          </div>
                          <div className="px-3 py-2 flex flex-wrap gap-2">
                            {codes.sort().map(code => (
                              <span key={code} className="px-2 py-0.5 text-xs font-mono bg-blue-50 text-blue-700 border border-blue-200 rounded">
                                {code}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button type="button" onClick={onClose}
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

export default RoleDetailsModal;
