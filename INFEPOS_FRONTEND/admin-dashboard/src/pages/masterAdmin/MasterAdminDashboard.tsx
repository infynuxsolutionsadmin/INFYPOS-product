import React, { useEffect, useState } from 'react';
import { getTenants, createTenant, updateTenant } from '../../api/tenants.api';
import type { Tenant } from '../../api/tenants.api';
import TenantFormModal from '../../components/tenants/TenantFormModal';
import EditTenantModal from '../../components/tenants/EditTenantModal';

const MasterAdminDashboard: React.FC = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const data = await getTenants();
      const items = data?.items || (Array.isArray(data) ? data : []);
      setTenants(items);
    } catch (err) {
      console.error('Failed to load tenants', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleCreateTenant = async (data: any) => {
    await createTenant(data);
    await fetchTenants(); // refresh the list
  };

  const handleUpdateTenant = async (id: string, data: any) => {
    await updateTenant(id, data);
    await fetchTenants();
  };

  return (
    <div className="max-w-7xl mx-auto py-6">
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Tenants Dashboard
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage all companies and store owners registered on the platform.
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <button
            onClick={() => setIsModalOpen(true)}
            type="button"
            className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Create New Tenant
          </button>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        {loading && tenants.length === 0 ? (
           <div className="p-10 text-center text-gray-500">Loading tenants...</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tenant Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined Date
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Edit</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-gray-50 transition-colors duration-150">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {tenant.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {tenant.code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      tenant.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {tenant.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(tenant.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => {
                        setSelectedTenant(tenant);
                        setIsEditModalOpen(true);
                      }}
                      className="text-blue-600 hover:text-blue-900 transition-colors"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
              {tenants.length === 0 && !loading && (
                 <tr>
                   <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500">
                     No tenants found. Click "Create New Tenant" to get started.
                   </td>
                 </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <TenantFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateTenant}
      />

      <EditTenantModal
        isOpen={isEditModalOpen}
        tenant={selectedTenant}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedTenant(null);
        }}
        onSubmit={handleUpdateTenant}
      />
    </div>
  );
};

export default MasterAdminDashboard;
