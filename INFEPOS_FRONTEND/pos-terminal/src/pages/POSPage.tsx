import React from 'react';
import POSLayout from '../layouts/POSLayout';
import ProductCatalog from '../components/pos/ProductCatalog';
import CartPanel from '../components/pos/CartPanel';

const POSPage: React.FC = () => {
  return (
    <POSLayout>
      {/* Left: Product search & catalog — takes remaining width */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: 'var(--pos-bg)',
        }}
      >
        <ProductCatalog />
      </div>

      {/* Right: Cart — fixed width panel */}
      <div
        style={{
          width: 340,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <CartPanel />
      </div>
    </POSLayout>
  );
};

export default POSPage;
