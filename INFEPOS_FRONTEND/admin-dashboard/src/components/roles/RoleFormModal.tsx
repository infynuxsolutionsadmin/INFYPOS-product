import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Role, CreateRolePayload, UpdateRolePayload, RoleStatus } from '../../types/roles';
import { createRole, updateRole } from '../../api/roles.api';

interface RoleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  role?: Role | null;
}

const RoleFormModal: React.FC<RoleFormModalProps> = ({ isOpen, onClose, onSuccess, role }) => {
  const isEdit = !!role;
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<RoleStatus>('ACTIVE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (role) {
        setName(role.name);
        setCode(role.code);
        setDescription(role.description || '');
        setStatus(role.status);
      } else {
        setName(''); setCode(''); setDescription(''); setStatus('ACTIVE');
      }
    }
  }, [isOpen, role]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate code format (UPPERCASE letters, numbers, underscores — as per backend @Matches)
    if (!isEdit && !/^[A-Z0-9_]+$/.test(code)) {
      setError('Code must contain only uppercase letters, numbers, and underscores.');
      return;
    }

    setLoading(true);
    try {
      if (isEdit) {
        const payload: UpdateRolePayload = {};
        if (name !== role!.name) payload.name = name;
        if (description !== (role!.description || '')) payload.description = description || undefined;
        if (status !== role!.status) payload.status = status;
        await updateRole(role!.id, payload);
      } else {
        const payload: CreateRolePayload = { name, code };
        if (description) payload.description = description;
        await createRole(payload);
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
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full relative z-10">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-center mb-5 border-b pb-3">
              <h3 className="text-lg font-medium text-gray-900">
                {isEdit ? 'Edit Role' : 'Create Role'}
              </h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500"><X className="h-6 w-6" /></button>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name *</label>
                <input
                  type="text" required maxLength={100} value={name}
                  onChange={e => setName(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Code *</label>
                {isEdit ? (
                  <div>
                    <input
                      type="text" disabled value={code}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm bg-gray-50 text-gray-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">Role code cannot be changed after creation.</p>
                  </div>
                ) : (
                  <div>
                    <input
                      type="text" required maxLength={50}
                      value={code}
                      onChange={e => setCode(e.target.value.toUpperCase())}
                      placeholder="e.g. STORE_MANAGER"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm font-mono focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">Only uppercase letters, numbers, and underscores.</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  maxLength={255} value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={2}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {isEdit && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as RoleStatus)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              )}

              <div className="bg-gray-50 px-4 py-3 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 rounded-b-lg border-t flex flex-row-reverse gap-3">
                <button
                  type="submit" disabled={loading}
                  className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 sm:text-sm disabled:opacity-50"
                >
                  {loading ? 'Saving...' : isEdit ? 'Update Role' : 'Create Role'}
                </button>
                <button type="button" onClick={onClose} disabled={loading}
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

export default RoleFormModal;
