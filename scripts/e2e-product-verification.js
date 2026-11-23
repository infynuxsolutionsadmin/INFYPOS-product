/**
 * INFYPOS Comprehensive End-to-End System & Edge-Case Verification Suite
 * Tests the entire product flow live against http://localhost:3000/api/v1
 */

const BASE_URL = 'http://localhost:3000/api/v1';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runTest() {
  console.log('================================================================');
  console.log('       INFYPOS FULL-PRODUCT & EDGE-CASE VERIFICATION');
  console.log('================================================================\n');

  const timestamp = Date.now().toString().slice(-6);
  const tenantCode = `TC${timestamp}`;
  const ownerEmail = `owner_${timestamp}@infypos.test`;
  const managerEmail = `manager_${timestamp}@infypos.test`;
  const cashierEmail = `cashier_${timestamp}@infypos.test`;
  const password = 'Password@123';

  let ownerToken = '';
  let managerToken = '';
  let cashierToken = '';
  let tenantId = '';
  let storeId = '';
  let managerId = '';
  let cashierId = '';
  let newPin = '4829';
  let product1Id = '';
  let product2Id = '';
  let shiftId = '';

  // -------------------------------------------------------------
  // STEP 1: Tenant / Account Registration
  // -------------------------------------------------------------
  console.log('[STEP 1] Creating New Company / Tenant Account...');
  const regRes = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      storeName: `London Retail Hub ${timestamp}`,
      tenantCode,
      ownerFirstName: 'Alice',
      ownerLastName: 'Owner',
      email: ownerEmail,
      password,
      plan: 'STARTER',
      billingCycle: 'MONTHLY',
    }),
  });

  if (!regRes.ok) {
    console.error('❌ Registration failed:', regRes.data);
    process.exit(1);
  }
  ownerToken = regRes.data.data.accessToken || regRes.data.data.tokens?.accessToken;
  tenantId = regRes.data.data.tenant.id;
  storeId = regRes.data.data.user?.storeId || regRes.data.data.store?.id;
  console.log(`✅ Tenant & Initial Store Created: Code=${tenantCode}, StoreId=${storeId}`);

  // If store was not created in reg, create one
  if (!storeId) {
    console.log('Creating explicit store...');
    const storeRes = await request('/stores', {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        name: `Flagship Store ${timestamp}`,
        code: `STR_${timestamp}`,
        currency: 'GBP',
        timezone: 'Europe/London',
        addressLine1: '10 Oxford Street, London',
      }),
    });
    if (!storeRes.ok) {
      console.error('❌ Store creation failed:', storeRes.data);
      process.exit(1);
    }
    storeId = storeRes.data.data.id;
  }
  console.log(`✅ Verified Active Store ID: ${storeId}`);

  // -------------------------------------------------------------
  // STEP 2: Roles Resolution (Store Manager & Cashier)
  // -------------------------------------------------------------
  console.log('\n[STEP 2] Resolving Roles (Store Manager & Cashier)...');
  const rolesRes = await request('/roles', {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  const roles = rolesRes.data.data?.items || rolesRes.data.data || [];
  const managerRole = roles.find(r => r.code === 'STORE_MANAGER');
  const cashierRole = roles.find(r => r.code === 'CASHIER');

  if (!managerRole || !cashierRole) {
    console.error('❌ Missing required roles:', { managerRole, cashierRole });
    process.exit(1);
  }
  console.log(`✅ Roles Resolved: STORE_MANAGER=${managerRole.id}, CASHIER=${cashierRole.id}`);

  // -------------------------------------------------------------
  // STEP 3: Manager Creation
  // -------------------------------------------------------------
  console.log('\n[STEP 3] Creating Store Manager...');
  const mgrRes = await request('/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({
      firstName: 'Bob',
      lastName: 'Manager',
      email: managerEmail,
      password,
      roleId: managerRole.id,
      storeId,
    }),
  });

  if (!mgrRes.ok) {
    console.error('❌ Manager creation failed:', mgrRes.data);
    process.exit(1);
  }
  managerId = mgrRes.data.data.id;
  console.log(`✅ Store Manager Created: ID=${managerId}, Email=${managerEmail}`);

  // -------------------------------------------------------------
  // STEP 4: Cashier Creation & PIN Provisioning
  // -------------------------------------------------------------
  console.log('\n[STEP 4] Creating Cashier...');
  const cashRes = await request('/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({
      firstName: 'Charlie',
      lastName: 'Cashier',
      email: cashierEmail,
      password,
      roleId: cashierRole.id,
      storeId,
    }),
  });

  if (!cashRes.ok) {
    console.error('❌ Cashier creation failed:', cashRes.data);
    process.exit(1);
  }
  cashierId = cashRes.data.data.id;
  console.log(`✅ Cashier Created: ID=${cashierId}`);

  // Verify Cashier appears in store list
  const cashiersListRes = await request(`/users/cashiers/${storeId}`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  const createdCashier = (cashiersListRes.data.data?.items || cashiersListRes.data.data || []).find(c => c.id === cashierId);
  console.log(`✅ Cashier Verified in Store: ${createdCashier.firstName} ${createdCashier.lastName}, Has PIN Hash=${Boolean(createdCashier.pinCodeHash)}`);

  // -------------------------------------------------------------
  // STEP 5: Store Manager Logs In & Resets Cashier PIN
  // -------------------------------------------------------------
  console.log('\n[STEP 5] Testing Store Manager Login & Cashier PIN Reset...');
  const mgrLoginRes = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: managerEmail,
      password,
      tenantCode,
    }),
  });

  if (!mgrLoginRes.ok) {
    console.error('❌ Manager login failed:', mgrLoginRes.data);
    process.exit(1);
  }
  managerToken = mgrLoginRes.data.data.accessToken || mgrLoginRes.data.data.tokens?.accessToken;
  console.log(`✅ Store Manager Authenticated Successfully!`);

  // Store Manager resets cashier PIN to `4829`
  console.log(`       Store Manager calling /users/${cashierId}/reset-pin with PIN="${newPin}"...`);
  const resetRes = await request(`/users/${cashierId}/reset-pin`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${managerToken}` },
    body: JSON.stringify({ pin: newPin }),
  });

  if (!resetRes.ok) {
    console.error('❌ Store Manager PIN reset failed:', resetRes.data);
    process.exit(1);
  }
  console.log(`✅ Cashier PIN successfully reset by Store Manager! Response:`, resetRes.data.data);

  // -------------------------------------------------------------
  // STEP 6: Cashier PIN Authentication Edge Cases
  // -------------------------------------------------------------
  console.log('\n[STEP 6] Testing Cashier PIN Login (Edge Cases: Wrong vs Right PIN)...');
  
  // Edge Case 6a: Wrong PIN (0000)
  const wrongPinRes = await request('/auth/cashier-login', {
    method: 'POST',
    body: JSON.stringify({
      storeId,
      cashierId,
      pin: '0000',
    }),
  });
  if (wrongPinRes.status === 401) {
    console.log(`✅ Correctly rejected invalid PIN (Status 401: "${wrongPinRes.data.message}")`);
  } else {
    console.error('❌ Expected 401 for wrong PIN, got:', wrongPinRes.status);
    process.exit(1);
  }

  // Edge Case 6b: Valid New PIN (4829)
  const pinLoginRes = await request('/auth/cashier-login', {
    method: 'POST',
    body: JSON.stringify({
      storeId,
      cashierId,
      pin: newPin,
    }),
  });

  if (!pinLoginRes.ok) {
    console.error('❌ Cashier PIN login with new PIN failed:', pinLoginRes.data);
    process.exit(1);
  }
  cashierToken = pinLoginRes.data.data.accessToken;
  console.log(`✅ Cashier PIN Login Successful with New PIN (${newPin})! JWT Access Token issued.`);

  // -------------------------------------------------------------
  // STEP 7: Products & Inventory Setup
  // -------------------------------------------------------------
  console.log('\n[STEP 7] Creating Products & Adding Initial Stock...');

  // Product 1: Espresso Blend (£3.50, VAT 20%, 100 Initial Stock)
  const p1Res = await request('/products', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({
      name: `Espresso Blend ${timestamp}`,
      sku: `ESP-${timestamp}`,
      barcode: `800100${timestamp}`,
      unit: 'cup',
      costPrice: 1.00,
      sellingPrice: 3.50,
      vatRate: 20,
      category: 'Beverages',
      initialStock: 100,
      minimumStock: 5,
      maximumStock: 200,
      reorderLevel: 10,
    }),
  });
  if (!p1Res.ok) {
    console.error('❌ Product 1 creation failed:', p1Res.data);
    process.exit(1);
  }
  product1Id = p1Res.data.data.id;

  // Product 2: Butter Croissant (£2.75, VAT 0%, 50 Initial Stock)
  const p2Res = await request('/products', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({
      name: `Butter Croissant ${timestamp}`,
      sku: `CRO-${timestamp}`,
      barcode: `800200${timestamp}`,
      unit: 'piece',
      costPrice: 0.80,
      sellingPrice: 2.75,
      vatRate: 0,
      category: 'Bakery',
      initialStock: 50,
      minimumStock: 5,
      maximumStock: 100,
      reorderLevel: 5,
    }),
  });
  if (!p2Res.ok) {
    console.error('❌ Product 2 creation failed:', p2Res.data);
    process.exit(1);
  }
  product2Id = p2Res.data.data.id;

  console.log(`✅ Products Created & Auto-Stocked:`);
  console.log(`   - Product 1: Espresso Blend (£3.50, 20% VAT, Initial Stock: 100) -> ${product1Id}`);
  console.log(`   - Product 2: Butter Croissant (£2.75, 0% VAT, Initial Stock: 50)  -> ${product2Id}`);

  // Edge Case 7a: DTO Validation Check - Missing required inventory fields in POST /inventory
  console.log('       Testing Edge Case: Missing required inventory fields validation (400)...');
  const invalidInvRes = await request('/inventory', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({
      storeId,
      productId: product1Id,
      quantityOnHand: 100,
    }),
  });
  if (invalidInvRes.status === 400) {
    console.log(`✅ Correctly rejected invalid inventory DTO (Status 400)`);
  } else {
    console.error('❌ Expected 400 for incomplete inventory DTO, got:', invalidInvRes.status);
    process.exit(1);
  }

  // Edge Case 7b: Duplicate Inventory Creation should return 409 Conflict
  console.log('       Testing Edge Case: Attempting duplicate POST /inventory for already provisioned product (409)...');
  const dupInvRes = await request('/inventory', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({
      storeId,
      productId: product1Id,
      quantityOnHand: 100,
      minimumStock: 5,
      maximumStock: 200,
      reorderLevel: 10,
    }),
  });
  if (dupInvRes.status === 409) {
    console.log(`✅ Correctly rejected duplicate inventory record (Status 409: "${dupInvRes.data.message}")`);
  } else {
    console.error('❌ Expected 409 for duplicate inventory creation, got:', dupInvRes.status);
    process.exit(1);
  }

  // -------------------------------------------------------------
  // STEP 8: POS Terminal Catalog Sync
  // -------------------------------------------------------------
  console.log('\n[STEP 8] Testing POS Terminal Catalog Sync (as Cashier)...');
  const catalogSyncRes = await request('/products?status=ACTIVE&limit=10000', {
    headers: { Authorization: `Bearer ${cashierToken}` },
  });
  const syncedProducts = catalogSyncRes.data.data?.items || catalogSyncRes.data.data || [];
  const foundP1 = syncedProducts.find(p => p.id === product1Id);
  const foundP2 = syncedProducts.find(p => p.id === product2Id);

  if (!foundP1 || !foundP2) {
    console.error('❌ Products not found in sync response:', { foundP1, foundP2 });
    process.exit(1);
  }
  console.log(`✅ POS Catalog Sync Successful! Downloaded ${syncedProducts.length} items to till.`);

  // -------------------------------------------------------------
  // STEP 9: Shift Lifecycle & Edge Cases
  // -------------------------------------------------------------
  console.log('\n[STEP 9] Testing Shift Lifecycle (Open, Conflict Check)...');

  // Check active shift: should be null before opening
  const activeBeforeRes = await request('/shifts/active', {
    headers: { Authorization: `Bearer ${cashierToken}` },
  });
  console.log(`✅ Active Shift before open verified: ${activeBeforeRes.data.data === null ? 'NULL (Clean State)' : 'Active'}`);

  // Open Shift with starting float £150.00
  const openShiftRes = await request('/shifts/open', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cashierToken}` },
    body: JSON.stringify({ startingFloat: 150.00 }),
  });
  if (!openShiftRes.ok) {
    console.error('❌ Open shift failed:', openShiftRes.data);
    process.exit(1);
  }
  shiftId = openShiftRes.data.data.id;
  console.log(`✅ Shift Opened: ID=${shiftId}, Starting Float=£150.00, Status=${openShiftRes.data.data.status}`);

  // Edge Case 9a: Concurrent Duplicate Shift Open (Should return 409 Conflict)
  console.log('       Testing Edge Case: Attempting to open duplicate concurrent shift on same store...');
  const duplicateShiftRes = await request('/shifts/open', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cashierToken}` },
    body: JSON.stringify({ startingFloat: 50.00 }),
  });
  if (duplicateShiftRes.status === 409) {
    console.log(`✅ Correctly rejected duplicate shift (Status 409: "${duplicateShiftRes.data.message}")`);
  } else {
    console.error('❌ Expected 409 Conflict, got:', duplicateShiftRes.status);
    process.exit(1);
  }

  // -------------------------------------------------------------
  // STEP 10: Sales Transactions & Billing Edge Cases
  // -------------------------------------------------------------
  console.log('\n[STEP 10] Executing POS Sales Billing & Validation Checks...');

  // Edge Case 10a: Non-UUID shiftId validation check (The exact issue we fixed)
  console.log('       Testing Edge Case: Non-UUID shiftId validation enforcement...');
  const invalidShiftSaleRes = await request('/sales', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cashierToken}`,
      'Idempotency-Key': `idem-invalid-${timestamp}`,
    },
    body: JSON.stringify({
      shiftId: 'local-shift-invalid-uuid',
      storeId,
      payments: [{ paymentMethod: 'CASH', amount: 10 }],
      items: [{ productId: product1Id, quantity: 1 }],
    }),
  });
  if (invalidShiftSaleRes.status === 400) {
    console.log(`✅ Backend correctly enforces UUID shiftId validation (Status 400: ${JSON.stringify(invalidShiftSaleRes.data.message)})`);
  } else {
    console.error('❌ Expected 400 for non-UUID shiftId, got:', invalidShiftSaleRes.status);
    process.exit(1);
  }

  // Edge Case 10b: Payment Tender Amount Mismatch (Underpayment Protection)
  console.log('       Testing Edge Case: Payment tender mismatch underpayment protection...');
  const underpayRes = await request('/sales', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cashierToken}`,
      'Idempotency-Key': `idem-underpay-${timestamp}`,
    },
    body: JSON.stringify({
      shiftId,
      storeId,
      payments: [{ paymentMethod: 'CASH', amount: 5.00 }],
      items: [{ productId: product1Id, quantity: 1 }],
    }),
  });
  if (underpayRes.status === 400) {
    console.log(`✅ Backend strictly prevents payment mismatch (Status 400: "${underpayRes.data.message}")`);
  } else {
    console.error('❌ Expected 400 for underpayment, got:', underpayRes.status);
    process.exit(1);
  }

  // Transaction 1: CASH Sale
  // 2x Espresso (£3.50 * 2 = £7.00 + 20% VAT £1.40 = £8.40) + 1x Croissant (£2.75, 0% VAT) = £11.15
  console.log('\n       Processing Transaction 1: CASH Sale (£11.15)...');
  const sale1Res = await request('/sales', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cashierToken}`,
      'Idempotency-Key': `idem-sale1-${timestamp}`,
    },
    body: JSON.stringify({
      shiftId,
      storeId,
      customerPhone: '+447123456789',
      payments: [{ paymentMethod: 'CASH', amount: 11.15 }],
      items: [
        { productId: product1Id, quantity: 2 },
        { productId: product2Id, quantity: 1 },
      ],
    }),
  });

  if (!sale1Res.ok) {
    console.error('❌ Sale 1 failed:', sale1Res.data);
    process.exit(1);
  }
  const sale1 = sale1Res.data.data;
  console.log(`✅ Sale 1 Completed! Sale#=${sale1.saleNumber}, Total=£${sale1.grandTotal}, Tax=£${sale1.taxAmount}`);

  // Transaction 2: CARD Sale
  // 4x Espresso (£3.50 * 4 = £14.00 + 20% VAT £2.80 = £16.80)
  console.log('\n       Processing Transaction 2: CARD Sale (£16.80)...');
  const sale2Res = await request('/sales', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cashierToken}`,
      'Idempotency-Key': `idem-sale2-${timestamp}`,
    },
    body: JSON.stringify({
      shiftId,
      storeId,
      payments: [{ paymentMethod: 'CARD', amount: 16.80 }],
      items: [{ productId: product1Id, quantity: 4 }],
    }),
  });

  if (!sale2Res.ok) {
    console.error('❌ Sale 2 failed:', sale2Res.data);
    process.exit(1);
  }
  const sale2 = sale2Res.data.data;
  console.log(`✅ Sale 2 Completed! Sale#=${sale2.saleNumber}, Total=£${sale2.grandTotal}, Status=${sale2.status}`);

  // -------------------------------------------------------------
  // STEP 11: Real-Time Inventory Stock Depletion Verification
  // -------------------------------------------------------------
  console.log('\n[STEP 11] Verifying Real-Time Inventory Depletion...');
  const invVerifyRes = await request(`/inventory?storeId=${storeId}`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  const currentInv = invVerifyRes.data.data?.items || invVerifyRes.data.data || [];
  const p1Stock = currentInv.find(i => i.productId === product1Id)?.quantityOnHand;
  const p2Stock = currentInv.find(i => i.productId === product2Id)?.quantityOnHand;

  console.log(`   - Product 1 (Espresso): Initial 100 - (2 + 4 sold) = Expected: 94 | Actual: ${p1Stock}`);
  console.log(`   - Product 2 (Croissant): Initial 50 - 1 sold        = Expected: 49 | Actual: ${p2Stock}`);

  if (Number(p1Stock) === 94 && Number(p2Stock) === 49) {
    console.log('✅ Inventory stock counts decremented accurately in real time!');
  } else {
    console.error('❌ Stock count mismatch!', { p1Stock, p2Stock });
    process.exit(1);
  }

  // -------------------------------------------------------------
  // STEP 12: Mid-Day Shift X-Report Verification
  // -------------------------------------------------------------
  console.log('\n[STEP 12] Checking Mid-Day Shift X-Report...');
  const xReportRes = await request(`/shifts/${shiftId}/x-report`, {
    headers: { Authorization: `Bearer ${cashierToken}` },
  });
  if (!xReportRes.ok) {
    console.error('❌ X-Report failed:', xReportRes.data);
    process.exit(1);
  }
  const xData = xReportRes.data.data;
  console.log(`✅ X-Report Verified:`);
  console.log(`   - Starting Float: £${xData.startingFloat.toFixed(2)}`);
  console.log(`   - Total Sales Count: ${xData.salesCount}`);
  console.log(`   - Gross Sales: £${xData.grossSales.toFixed(2)}`);
  console.log(`   - Cash in Drawer: £${xData.cashSales.toFixed(2)}`);
  console.log(`   - Expected Cash: Starting Float (£${xData.startingFloat}) + Cash Sales (£${xData.cashSales}) = £${xData.expectedCash.toFixed(2)}`);

  if (xData.salesCount === 2 && xData.cashSales === 11.15 && xData.expectedCash === 161.15) {
    console.log('✅ Shift financial totals match expected transaction figures precisely!');
  } else {
    console.error('❌ X-Report calculations mismatch:', xData);
    process.exit(1);
  }

  // -------------------------------------------------------------
  // STEP 13: End of Day Z-Report & Shift Close
  // -------------------------------------------------------------
  console.log('\n[STEP 13] Closing Shift & Generating Z-Report...');
  const closeRes = await request(`/shifts/${shiftId}/close`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cashierToken}` },
    body: JSON.stringify({ declaredCash: 161.15 }),
  });

  if (!closeRes.ok) {
    console.error('❌ Shift close failed:', closeRes.data);
    process.exit(1);
  }
  const closedShift = closeRes.data.data;
  console.log(`✅ Shift Closed Successfully!`);
  console.log(`   - Shift Status: ${closedShift.status}`);
  console.log(`   - Z-Report Number: #${closedShift.zReportNumber}`);
  console.log(`   - Declared Cash: £${closedShift.declaredCash}`);
  console.log(`   - Expected Cash: £${closedShift.expectedCash}`);
  console.log(`   - Variance: £${closedShift.variance}`);

  // Edge Case 13a: Attempt Sale on Closed Shift
  console.log('\n       Testing Edge Case: Attempting sale on closed shift...');
  const closedShiftSaleRes = await request('/sales', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cashierToken}`,
      'Idempotency-Key': `idem-closed-${timestamp}`,
    },
    body: JSON.stringify({
      shiftId,
      storeId,
      payments: [{ paymentMethod: 'CASH', amount: 3.50 }],
      items: [{ productId: product1Id, quantity: 1 }],
    }),
  });

  if (closedShiftSaleRes.status === 400) {
    console.log(`✅ Correctly rejected sale on closed shift (Status 400: "${closedShiftSaleRes.data.message}")`);
  } else {
    console.error('❌ Expected 400 for sale on closed shift, got:', closedShiftSaleRes.status);
    process.exit(1);
  }

  // -------------------------------------------------------------
  // STEP 14: Offline POS Synchronization & Idempotency Check
  // -------------------------------------------------------------
  console.log('\n[STEP 14] Testing Offline POS Batch Synchronization via POST /sync...');
  const offlineShiftId = 'c1111111-2222-4333-8444-555555555555';
  const offlineSaleId1 = `offline-sale-1-${timestamp}`;
  const offlineSaleId2 = `offline-sale-2-${timestamp}`;

  // Offline Sale 1: 1x Espresso (£3.50 + 20% VAT = £4.20)
  // Offline Sale 2: 1x Croissant (£2.75 + 0% VAT = £2.75)
  const syncPayload = {
    deviceId: `POS-TILL-${timestamp}`,
    events: [
      {
        eventId: offlineSaleId1,
        eventType: 'SALE',
        occurredAt: new Date().toISOString(),
        payload: {
          shiftId: offlineShiftId,
          storeId,
          payments: [{ paymentMethod: 'CASH', amount: 4.20 }],
          items: [{ productId: product1Id, quantity: 1 }],
        },
      },
      {
        eventId: offlineSaleId2,
        eventType: 'SALE',
        occurredAt: new Date().toISOString(),
        payload: {
          shiftId: offlineShiftId,
          storeId,
          payments: [{ paymentMethod: 'CARD', amount: 2.75 }],
          items: [{ productId: product2Id, quantity: 1 }],
        },
      },
    ],
  };

  const syncRes = await request('/sync', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cashierToken}` },
    body: JSON.stringify(syncPayload),
  });

  if (!syncRes.ok) {
    console.error('❌ Sync failed:', syncRes.data);
    process.exit(1);
  }

  const syncResult = syncRes.data.data || syncRes.data;
  console.log(`✅ Offline Sync Batch Processed!`);
  console.log(`   - Processed Events: ${syncResult.processed?.length || 0}`);
  console.log(`   - Failed Events:    ${syncResult.failed?.length || 0}`);

  if (syncResult.processed?.length !== 2) {
    console.error('❌ Expected 2 processed events in sync, got:', syncResult);
    process.exit(1);
  }

  // Edge Case 14a: Idempotent Replay (Re-submitting the same sync batch must not duplicate sales or inventory deductions)
  console.log('       Testing Edge Case: Re-submitting duplicate sync batch (Idempotency Invariant)...');
  const replaySyncRes = await request('/sync', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cashierToken}` },
    body: JSON.stringify(syncPayload),
  });

  const replayResult = replaySyncRes.data.data || replaySyncRes.data;
  if (replayResult.alreadyProcessed?.length === 2) {
    console.log(`✅ Idempotency verified! Server correctly recognized already-processed events (${replayResult.alreadyProcessed.length} events acknowledged).`);
  } else {
    console.error('❌ Expected 2 alreadyProcessed events on replay, got:', replayResult);
    process.exit(1);
  }

  // Edge Case 14b: Verify inventory accurately reflects offline batch sales
  console.log('       Verifying inventory counts after offline sync...');
  const invAfterSyncRes = await request(`/inventory?storeId=${storeId}`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  const invAfterSync = invAfterSyncRes.data.data?.items || invAfterSyncRes.data.data || [];
  const p1StockAfter = invAfterSync.find(i => i.productId === product1Id)?.quantityOnHand;
  const p2StockAfter = invAfterSync.find(i => i.productId === product2Id)?.quantityOnHand;

  console.log(`   - Product 1 (Espresso): 94 - 1 offline sold = Expected: 93 | Actual: ${p1StockAfter}`);
  console.log(`   - Product 2 (Croissant): 49 - 1 offline sold = Expected: 48 | Actual: ${p2StockAfter}`);

  if (Number(p1StockAfter) === 93 && Number(p2StockAfter) === 48) {
    console.log('✅ Offline batch sales decremented inventory accurately without duplication!');
  } else {
    console.error('❌ Stock count mismatch after offline sync!', { p1StockAfter, p2StockAfter });
    process.exit(1);
  }

  console.log('\n================================================================');
  console.log('   🎉 ALL 14 END-TO-END FLOWS & EDGE CASES PASSED PERFECTLY!');
  console.log('================================================================\n');
}

runTest().catch((err) => {
  console.error('Unhandled test failure:', err);
  process.exit(1);
});
