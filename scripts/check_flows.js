const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkFlows() {
  console.log('Connecting to MySQL...');
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      port: process.env.DB_PORT,
    });

    console.log('Checking directus_flows...');
    const [flows] = await connection.execute(
      "SELECT id, status, name, `trigger`, collection FROM directus_flows WHERE collection = 'lotes'"
    );
    console.log('Flows on lotes:', JSON.stringify(flows, null, 2));

    console.log('Checking triggers on table lotes...');
    const [triggers] = await connection.execute(
      `SELECT TRIGGER_NAME, ACTION_TIMING, EVENT_MANIPULATION, ACTION_STATEMENT 
         FROM information_schema.TRIGGERS 
         WHERE EVENT_OBJECT_TABLE = 'lotes' AND EVENT_OBJECT_SCHEMA = ?`,
      [process.env.DB_DATABASE]
    );
    console.log('DB Triggers:', JSON.stringify(triggers, null, 2));

    await connection.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkFlows();
