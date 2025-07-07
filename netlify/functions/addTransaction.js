const { Client } = require('pg');
const { DateTime } = require('luxon'); // Add this line

exports.handler = async function (event) {
  const { vendor, amount_cents } = JSON.parse(event.body);

  // Force EST/EDT using luxon
  const now = DateTime.now().setZone('America/New_York').toISO(); // ISO string in EST/EDT

  const client = new Client({
    connectionString: process.env.NEON_DB_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  await client.query(
    'INSERT INTO transactions (vendor, amount_cents, date) VALUES ($1, $2, $3)',
    [vendor, amount_cents, now]
  );

  await client.end();

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true })
  };
};
