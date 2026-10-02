require('dotenv').config();
const BASE_URL = 'http://localhost:3000/api/v1';

async function testRefresh() {
  // 1. Verify Login
  console.log('1. Logging in...');
  let res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantCode: 'DEMO', email: 'owner@demo.com', password: 'Admin@123' })
  });
  let data = await res.json();
  if (res.status === 201 || res.status === 200) {
    console.log('✅ Login successful.');
    const refreshToken = data.data.refreshToken;

    console.log('\n2. Refreshing...');
    let refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
    });
    let refreshData = await refreshRes.json();
    console.log('Refresh response:', refreshRes.status, refreshData);
  } else {
    console.log('❌ Login failed:', data);
  }
}

testRefresh();
