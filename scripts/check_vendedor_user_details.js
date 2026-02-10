const DIRECTUS_URL = 'http://127.0.0.1:8055';
const ADMIN_EMAIL = 'admin@quintas.com';
const ADMIN_PASSWORD = 'admin_quintas_2024';

async function checkVendedorUser() {
  console.log('🔍 Checking Vendedor User Details...');

  // 1. Admin Login
  let adminToken;
  try {
    const res = await fetch(`${DIRECTUS_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    });
    const data = await res.json();
    adminToken = data.data.access_token;
  } catch (e) {
    console.error('❌ Admin login failed:', e);
    process.exit(1);
  }

  // 2. Search for Erick Navarrete
  console.log('👤 Searching for user "Erick"...');
  const searchRes = await fetch(`${DIRECTUS_URL}/users?filter[_or][0][first_name][_contains]=Erick&filter[_or][1][email][_contains]=Erick&fields=*,role.*`, {
      headers: { Authorization: `Bearer ${adminToken}` }
  });
  
  const searchData = await searchRes.json();
  
  if (searchData.data && searchData.data.length > 0) {
      const user = searchData.data[0];
      console.log('✅ User Found:');
      console.log(`   - ID: ${user.id}`);
      console.log(`   - Name: ${user.first_name} ${user.last_name}`);
      console.log(`   - Email: ${user.email}`);
      console.log(`   - Status: ${user.status}`);
      console.log(`   - Role: ${user.role ? user.role.name : 'No Role'}`);
      
      if (user.status === 'active' && user.role && user.role.name === 'Vendedor') {
          console.log('\n🎉 This user is correctly configured as an Active Vendedor.');
          console.log('   You can login with this email and your password.');
      } else {
          console.log('\n⚠️ Issues found:');
          if (user.status !== 'active') console.log(`   - User is NOT active (Status: ${user.status})`);
          if (!user.role || user.role.name !== 'Vendedor') console.log(`   - User does NOT have Vendedor role (Role: ${user.role ? user.role.name : 'None'})`);
      }
  } else {
      console.log('❌ User "Erick" not found.');
      // List all users to see if we missed the name
      const allRes = await fetch(`${DIRECTUS_URL}/users?limit=10&fields=first_name,last_name,email`, {
          headers: { Authorization: `Bearer ${adminToken}` }
      });
      const allData = await allRes.json();
      console.log('\nExisting Users:', allData.data.map(u => `${u.first_name} ${u.last_name} (${u.email})`).join(', '));
  }
}

checkVendedorUser();
