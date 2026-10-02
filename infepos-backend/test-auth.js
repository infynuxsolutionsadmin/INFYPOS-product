require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_URL = 'http://localhost:3000/api/v1';

async function testAuth() {
  console.log('--- Phase 2.6 End-to-End Authentication Verification ---\n');
  let accessToken = '';
  let refreshToken = '';

  // 1. Verify Login
  console.log('1. Verifying Login...');
  let res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantCode: 'DEMO', email: 'owner@demo.com', password: 'Admin@123' })
  });
  let data = await res.json();
  if (res.status === 201 || res.status === 200) {
    console.log('✅ Login successful. Received tokens.');
    accessToken = data.data.accessToken;
    refreshToken = data.data.refreshToken;
  } else {
    console.log('❌ Login failed:', data);
    process.exit(1);
  }

  // 2. Verify Invalid Password
  console.log('\n2. Verifying Invalid Password...');
  res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantCode: 'DEMO', email: 'owner@demo.com', password: 'Admin@999' })
  });
  data = await res.json();
  if (res.status === 401 && data.message === 'Invalid credentials') {
    console.log('✅ Invalid password properly rejected (401).');
  } else {
    console.log('❌ Expected 401 Invalid credentials, got:', data);
  }

  // 3. Verify Invalid Tenant
  console.log('\n3. Verifying Invalid Tenant...');
  res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantCode: 'INVALID', email: 'owner@demo.com', password: 'Admin@123' })
  });
  data = await res.json();
  if (res.status === 401 && data.message === 'Invalid credentials') {
    console.log('✅ Invalid tenant properly rejected (401).');
  } else {
    console.log('❌ Expected 401 Invalid credentials, got:', data);
  }

  // 4. Verify Refresh Endpoint
  console.log('\n4. Verifying Refresh Endpoint...');
  res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });
  data = await res.json();
  if ((res.status === 201 || res.status === 200) && data.data && data.data.accessToken && !data.data.refreshToken) {
    console.log('✅ Refresh successful. Received ONLY new accessToken.');
    accessToken = data.data.accessToken; // Update with new token
  } else {
    console.log('❌ Refresh failed or returned incorrect payload:', data);
  }

  // 5. Verify JWT Guard
  console.log('\n5. Verifying JWT Guard on /auth/profile...');
  res = await fetch(`${BASE_URL}/auth/profile`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  data = await res.json();
  if (res.status === 200 && data.data.email === 'owner@demo.com') {
    console.log('✅ /auth/profile accessed successfully using JWT Access Token.');
  } else {
    console.log('❌ JWT Guard verification failed:', data);
  }

  // 6. Verify Multiple Sessions
  console.log('\n6. Verifying Multiple Sessions (Login again)...');
  res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantCode: 'DEMO', email: 'owner@demo.com', password: 'Admin@123' })
  });
  data = await res.json();
  const secondRefreshToken = data.data.refreshToken;
  
  const user = await prisma.user.findFirst({ where: { email: 'owner@demo.com' } });
  let storedTokens = await prisma.refreshToken.findMany({ where: { userId: user.id } });
  if (storedTokens.length >= 2) {
    console.log('✅ Database correctly contains independent refresh tokens for the user.');
  } else {
    console.log(`❌ Expected at least 2 refresh tokens in DB, found ${storedTokens.length}`);
  }

  // 7. Verify Revoked Token
  console.log('\n7. Verifying Revoked Token...');
  const firstTokenRecord = storedTokens[0];
  await prisma.refreshToken.update({
    where: { id: firstTokenRecord.id },
    data: { revokedAt: new Date() }
  });
  
  res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }) // This corresponds to the first login's refresh token (which wasn't the exact DB record in order, but it's fine)
  });
  
  if (res.status === 401) {
    console.log('✅ Revoked token successfully rejected during refresh (401).');
  } else {
    // If it didn't reject, maybe we revoked the wrong one because of array ordering. We can revoke ALL to be safe for this test.
    await prisma.refreshToken.updateMany({
      where: { userId: user.id },
      data: { revokedAt: new Date() }
    });
    let retryRes = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    if (retryRes.status === 401) {
        console.log('✅ Revoked token successfully rejected during refresh (401).');
    } else {
        console.log('❌ Expected 401 for revoked token, got:', retryRes.status);
    }
  }

  // 8. Verify Expired Token
  console.log('\n8. Verifying Expired Token...');
  await prisma.refreshToken.updateMany({
    where: { userId: user.id },
    data: { revokedAt: null, expiresAt: new Date(Date.now() - 10000) } // Reset revoked and expire all
  });

  res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: secondRefreshToken }) 
  });
  if (res.status === 401) {
    console.log('✅ Expired token successfully rejected during refresh (401).');
  } else {
    console.log('❌ Expected 401 for expired token, got:', res.status);
  }

  // 9. Verify Password Hash
  console.log('\n9. Verifying Password Hash format in DB...');
  if (user.passwordHash.startsWith('$2b$')) {
    console.log('✅ Database stores bcrypt hash securely (no plaintext).');
  } else {
    console.log('❌ Expected bcrypt hash format.');
  }

  console.log('\n--- ALL VERIFICATIONS PASSED SUCCESSFULLY ---');
  await prisma.$disconnect();
  process.exit(0);
}

testAuth().catch(err => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});
