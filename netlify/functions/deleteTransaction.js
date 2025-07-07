const { Client } = require('pg');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { id } = JSON.parse(event.body);
  const client = new Client({ connectionString: process.env.NEON_DB_URL });

  try {
    await client.connect();
    const result = await client.query('DELETE FROM transactions WHERE id = $1', [id]);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, deleted: result.rowCount }),
    };
  } catch (err) {
    console.error('Error deleting transaction:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to delete transaction' }),
    };
  } finally {
    await client.end();
  }
};