const { Client } = require('pg');

function getWeekStart(dateString) {
  const date = new Date(dateString);
  const day = date.getUTCDay();
  const sunday = new Date(date);
  sunday.setUTCDate(date.getUTCDate() - day);
  return sunday.toISOString().split('T')[0];
}

exports.handler = async (event) => {
  const client = new Client({ connectionString: process.env.NEON_DB_URL });

  try {
    await client.connect();
    const today = new Date().toISOString().split('T')[0];
    const weekStart = getWeekStart(today);

    const result = await client.query(
      'SELECT amount_cents FROM weekly_budgets WHERE week_start_date = $1',
      [weekStart]
    );

    return {
      statusCode: 200,
      body: JSON.stringify(result.rows[0] || { amount_cents: 0 }),
    };
  } catch (err) {
    console.error('Error getting budget:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to get budget' }),
    };
  } finally {
    await client.end();
  }
};