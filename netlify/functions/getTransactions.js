const { Client } = require('pg');

function getWeekRange(dateString) {
  const date = new Date(dateString);
  const day = date.getUTCDay();
  const sunday = new Date(date);
  sunday.setUTCDate(date.getUTCDate() - day);
  const saturday = new Date(sunday);
  saturday.setUTCDate(sunday.getUTCDate() + 6);
  return {
    start: sunday.toISOString().split('T')[0],
    end: saturday.toISOString().split('T')[0],
  };
}

exports.handler = async (event) => {
  const client = new Client({ connectionString: process.env.NEON_DB_URL });

  try {
    await client.connect();
    const today = new Date().toISOString().split('T')[0];
    const { start, end } = getWeekRange(today);

    const result = await client.query(`
      SELECT t.id, v.name AS vendor, t.amount_cents, t.description, t.date
      FROM transactions t
      JOIN vendors v ON t.vendor_id = v.id
      WHERE t.date BETWEEN $1 AND $2
      ORDER BY t.date DESC
    `, [start, end]);

    return { statusCode: 200, body: JSON.stringify(result.rows) };
  } catch (err) {
    console.error('Error fetching transactions:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch transactions' }) };
  } finally {
    await client.end();
  }
};