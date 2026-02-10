const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkPermissions() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });

  const policyId = '8704c7c8-8924-4246-9214-727500c283c7';
  console.log(`Checking permissions for policy: ${policyId}`);

  const [perms] = await connection.query(
    'SELECT collection, action, permissions FROM directus_permissions WHERE policy = ?',
    [policyId]
  );

  if (perms.length > 0) {
    perms.forEach((p) => {
      console.log(`Collection: ${p.collection}, Action: ${p.action}`);
    });
  } else {
    console.log('No permissions found for this policy.');
  }

  await connection.end();
}

checkPermissions();
