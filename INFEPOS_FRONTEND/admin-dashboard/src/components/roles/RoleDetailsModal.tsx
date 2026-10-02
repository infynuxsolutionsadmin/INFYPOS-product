import React, { useState, useEffect } from 'react';
import { X, Shield, ChevronUp, Users, Monitor, FileText, Folder, Package, Key, Tag, ShoppingCart, BarChart2, ShieldCheck, DollarSign, RotateCcw, Settings, Clock } from 'lucide-react';
import type { Role } from '../../types/roles';
import { getRoleById } from '../../api/roles.api';
import RoleStatusBadge from './RoleStatusBadge';

interface RoleDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  roleId: string | null;
}

const getModuleIcon = (module: string) => {
  switch (module.toUpperCase()) {
    case 'CUSTOMERS': return <Users className="w-4 h-4 text-purple-600" />;
    case 'DASHBOARD': return <Monitor className="w-4 h-4 text-green-600" />;
    case 'GOODSRECEIPTS': return <FileText className="w-4 h-4 text-orange-600" />;
    case 'INVENTORY': return <Package className="w-4 h-4 text-teal-600" />;
    case 'PERMISSIONS': return <Key className="w-4 h-4 text-rose-600" />;
    case 'PRODUCTS': return <Tag className="w-4 h-4 text-blue-600" />;
    case 'PURCHASES': return <ShoppingCart className="w-4 h-4 text-emerald-600" />;
    case 'REPORTS': return <BarChart2 className="w-4 h-4 text-fuchsia-600" />;
    case 'ROLES': return <ShieldCheck className="w-4 h-4 text-indigo-600" />;
    case 'SALES': return <DollarSign className="w-4 h-4 text-green-600" />;
    case 'SALESRETURNS': return <RotateCcw className="w-4 h-4 text-red-600" />;
    case 'SETTINGS': return <Settings className="w-4 h-4 text-slate-600" />;
    case 'SHIFTS': return <Clock className="w-4 h-4 text-sky-600" />;
    default: return <Folder className="w-4 h-4 text-indigo-600" />;
  }
};

const getModuleBg = (module: string) => {
  switch (module.toUpperCase()) {
    case 'CUSTOMERS': return 'bg-purple-100';
    case 'DASHBOARD': return 'bg-green-100';
    case 'GOODSRECEIPTS': return 'bg-orange-100';
    case 'INVENTORY': return 'bg-teal-100';
    case 'PERMISSIONS': return 'bg-rose-100';
    case 'PRODUCTS': return 'bg-blue-100';
    case 'PURCHASES': return 'bg-emerald-100';
    case 'REPORTS': return 'bg-fuchsia-100';
    case 'ROLES': return 'bg-indigo-100';
    case 'SALES': return 'bg-green-100';
    case 'SALESRETURNS': return 'bg-red-100';
    case 'SETTINGS': return 'bg-slate-100';
    case 'SHIFTS': return 'bg-sky-100';
    default: return 'bg-indigo-100';
  }
};

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
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"></div>
        </div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
        <div className="inline-block align-bottom bg-white rounded-[30px] text-left overflow-hidden shadow-[0px_8px_40px_rgba(0,0,0,0.08)] border border-gray-100 transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl w-full relative z-10">
          <div className="bg-white px-6 pt-6 pb-2 sm:p-8 sm:pb-4">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center flex-shrink-0">
                  <Shield className="h-5 w-5 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-[#1a1f36]">Role Details</h3>
                {role && <RoleStatusBadge status={role.status} />}
                {role?.isSystem && (
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">System</span>
                )}
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
            ) : role ? (
              <div className="space-y-6">
                <div className="bg-slate-50/50 p-6 rounded-2xl border border-gray-100">
                  <dl className="grid grid-cols-4 gap-x-5 gap-y-4">
                    <div>
                      <dt className="text-xs font-medium text-gray-400 mb-1">Name</dt>
                      <dd className="text-sm font-semibold text-[#1a1f36]">{role.name}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-gray-400 mb-1">Code</dt>
                      <dd className="text-sm font-medium text-gray-700">{role.code}</dd>
                    </div>
                    {role.description && (
                      <div className="col-span-2">
                        <dt className="text-xs font-medium text-gray-400 mb-1">Description</dt>
                        <dd className="text-sm font-medium text-[#1a1f36]">{role.description}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-xs font-medium text-gray-400 mb-1">Created</dt>
                      <dd className="text-sm font-medium text-[#1a1f36]">{new Date(role.createdAt).toLocaleDateString()}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-gray-400 mb-1">Last Updated</dt>
                      <dd className="text-sm font-medium text-[#1a1f36]">{new Date(role.updatedAt).toLocaleDateString()}</dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h4 className="text-[15px] font-bold text-[#1a1f36] mt-6 mb-3">
                    Assigned Permissions ({role.permissions?.length ?? 0})
                  </h4>
                  {Object.keys(grouped).length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No permissions assigned.</p>
                  ) : (
                    <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                      {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([module, codes]) => (
                        <div key={module} className="border border-gray-100 rounded-2xl overflow-hidden">
                          <div className="bg-[#f8fafc] px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                               <div className={`w-8 h-8 rounded-full ${getModuleBg(module)} flex items-center justify-center`}>
                                 {getModuleIcon(module)}
                               </div>
                               <span className="text-[11px] font-bold text-[#1a1f36] uppercase tracking-wider">{module}</span>
                            </div>
                            <ChevronUp className="w-4 h-4 text-gray-400" />
                          </div>
                          <div className="p-4 bg-white flex flex-wrap gap-2">
                            {codes.sort().map(code => (
                              <span key={code} className="px-3 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">
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
          <div className="px-6 py-5 sm:px-8 sm:flex sm:flex-row-reverse rounded-b-[30px] bg-white">
            <button type="button" onClick={onClose}
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

export default RoleDetailsModal;
