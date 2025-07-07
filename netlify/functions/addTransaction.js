const { Client } = require('pg');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { vendor, amount_cents, description, date } = JSON.parse(event.body);
  const client = new Client({ connectionString: process.env.NEON_DB_URL });

  try {
    await client.connect();

    const vendorRes = await client.query(
      'INSERT INTO vendors (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id',
      [vendor]
    );

    const vendor_id = vendorRes.rows[0].id;

    await client.query(
      'INSERT INTO transactions (vendor_id, amount_cents, description, date) VALUES ($1, $2, $3, $4)',
      [vendor_id, amount_cents, description, date]
    );

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to add transaction' }) };
  } finally {
    await client.end();
  }
};