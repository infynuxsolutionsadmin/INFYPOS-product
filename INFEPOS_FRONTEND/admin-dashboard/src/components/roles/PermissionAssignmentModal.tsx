import React, { useState, useEffect } from 'react';
import { X, Shield, Lock } from 'lucide-react';
import type { Permission } from '../../types/permissions';
import type { Role } from '../../types/roles';
import { getAllPermissions } from '../../api/permissions.api';
import { updateRolePermissions } from '../../api/roles.api';

interface PermissionAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  role: Role | null;
}

const PermissionAssignmentModal: React.FC<PermissionAssignmentModalProps> = ({
  isOpen, onClose, onSuccess, role,
}) => {
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && role) {
      setError(null);
      setDataLoading(true);
      getAllPermissions()
        .then(perms => {
          setAllPermissions(perms);
          // Pre-select permissions already on the role (from findOne include)
          const assigned = new Set((role.permissions ?? []).map(p => p.id));
          setSelectedIds(assigned);
        })
        .catch(err => setError(err.response?.data?.message || err.message || 'Failed to load permissions'))
        .finally(() => setDataLoading(false));
    }
  }, [isOpen, role]);

  if (!isOpen || !role) return null;

  const isOwner = role.code === 'OWNER';

  // Group by module from the flat list
  const grouped = allPermissions.reduce<Record<string, Permission[]>>((acc, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {});

  const toggleAll = (modulePerms: Permission[], check: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      modulePerms.forEach(p => (check ? next.add(p.id) : next.delete(p.id)));
      return next;
    });
  };

  const toggleOne = (id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      await updateRolePermissions(role.id, { permissionIds: Array.from(selectedIds) });
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to update permissions';
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
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl w-full relative z-10">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <Shield className="h-5 w-5 text-gray-500" />
                Permissions — <span className="font-bold text-blue-700">{role.name}</span>
                <code className="ml-1 text-xs bg-gray-100 px-1 py-0.5 rounded">{role.code}</code>
              </h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500"><X className="h-6 w-6" /></button>
            </div>

            {isOwner && (
              <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded text-sm flex items-start gap-2">
                <Lock className="h-4 w-4 mt-0.5 shrink-0" />
                The OWNER role has all permissions and cannot be modified. The backend will reject any changes.
              </div>
            )}

            {error && (
              <div className="mb-3 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">{error}</div>
            )}

            {dataLoading ? (
              <div className="py-8 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([module, perms]) => {
                  const allChecked = perms.every(p => selectedIds.has(p.id));
                  const someChecked = perms.some(p => selectedIds.has(p.id));
                  return (
                    <div key={module} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2 flex items-center justify-between border-b">
                        <span className="text-sm font-bold text-gray-800 capitalize">{module}</span>
                        {!isOwner && (
                          <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={allChecked}
                              ref={el => { if (el) el.indeterminate = someChecked && !allChecked; }}
                              onChange={e => toggleAll(perms, e.target.checked)}
                              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                            />
                            All
                          </label>
                        )}
                      </div>
                      <div className="divide-y divide-gray-100">
                        {perms.map(p => (
                          <label key={p.id} className={`flex items-center gap-3 px-4 py-2.5 ${isOwner ? 'cursor-default' : 'cursor-pointer hover:bg-blue-50'}`}>
                            <input
                              type="checkbox"
                              disabled={isOwner}
                              checked={selectedIds.has(p.id)}
                              onChange={e => !isOwner && toggleOne(p.id, e.target.checked)}
                              className="h-4 w-4 text-blue-600 border-gray-300 rounded disabled:opacity-60"
                            />
                            <span className="text-sm text-gray-700 font-mono">{p.code}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-3">
            {!isOwner && (
              <button
                type="button"
                disabled={loading || dataLoading}
                onClick={handleSave}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Permissions'}
              </button>
            )}
            <button type="button" onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:w-auto sm:text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PermissionAssignmentModal;
