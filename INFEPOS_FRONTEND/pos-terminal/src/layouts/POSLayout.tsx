import React from 'react';
import POSHeader from '../components/pos/POSHeader';

interface POSLayoutProps {
  children: React.ReactNode;
}

const POSLayout: React.FC<POSLayoutProps> = ({ children }) => {
  return (
    <div className="pos-layout-wrapper" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '100%', overflow: 'hidden' }}>
      <POSHeader />
      <div className="pos-main-container" style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {children}
      </div>
    </div>
  );
};

export default POSLayout;
