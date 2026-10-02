async function testSync() {
  try {
    const loginRes = await fetch('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantCode: 'techstore',
        email: 'admin@techstore.com',
        password: 'password123',
      })
    });
    
    if (!loginRes.ok) {
        console.error('Login failed', await loginRes.text());
        return;
    }
    const loginData = await loginRes.json();
    const token = loginData.data.accessToken;

    const payload = {
      deviceId: 'test-device',
      events: [
        {
          eventId: 'OFFLINE-161001',
          eventType: 'SALE',
          occurredAt: new Date().toISOString(),
          payload: {
            shiftId: 'some-shift-id',
            storeId: 'c3467d75',
            discountAmount: 0,
            paymentMethod: 'CASH',
            items: [
              { productId: 'some-product', quantity: 6 }
            ]
          }
        }
      ]
    };

    const syncRes = await fetch('http://localhost:3000/api/v1/sync', {
      method: 'POST',
      headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify(payload)
    });

    console.log('Status:', syncRes.status);
    console.log('Response:', await syncRes.text());
  } catch(e) {
    console.error('Error:', e);
  }
}

testSync();
