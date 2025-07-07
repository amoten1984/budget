const { Client } = require('pg');
const { DateTime } = require('luxon');

exports.handler = async function (event) {
  const { vendor, amount_cents } = JSON.parse(event.body);

  // Get current time in EST
  const now = DateTime.now().setZone('America/New_York').toISODate(); // DATE only (not timestamp)

  const client = new Client({
    connectionString: process.env.NEON_DB_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    // Ensure vendor exists or insert it
    await client.query(
      `INSERT INTO vendors (name)
       VALUES ($1)
       ON CONFLICT (name) DO NOTHING`,
      [vendor]
    );

    // Look up vendor ID
    const { rows } = await client.query(
      `SELECT id FROM vendors WHERE name = $1`,
      [vendor]
    );

    const vendor_id = rows[0]?.id;

    if (!vendor_id) {
      throw new Error('Vendor lookup failed.');
    }

    // Insert the transaction
    await client.query(
      `INSERT INTO transactions (vendor_id, amount_cents, date)
       VALUES ($1, $2, $3)`,
      [vendor_id, amount_cents, now]
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  } catch (err) {
    console.error('addTransaction error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to add transaction.' })
    };
  } finally {
    await client.end();
  }
};
