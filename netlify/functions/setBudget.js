const { Client } = require('pg');

function getWeekStart(dateString) {
  const date = new Date(dateString);
  const day = date.getUTCDay();
  const sunday = new Date(date);
  sunday.setUTCDate(date.getUTCDate() - day);
  return sunday.toISOString().split('T')[0];
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { amount_cents } = JSON.parse(event.body);
  const client = new Client({ connectionString: process.env.NEON_DB_URL });

  try {
    await client.connect();
    const today = new Date().toISOString().split('T')[0];
    const weekStart = getWeekStart(today);

    await client.query(
      'INSERT INTO weekly_budgets (week_start_date, amount_cents) VALUES ($1, $2) ON CONFLICT (week_start_date) DO UPDATE SET amount_cents = EXCLUDED.amount_cents',
      [weekStart, amount_cents]
    );

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error('Error setting budget:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to set budget' }) };
  } finally {
    await client.end();
  }
};