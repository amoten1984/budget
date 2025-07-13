
const { Client } = require('pg');
const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

exports.handler = async function(event, context) {
  const db = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await db.connect();

    const today = new Date();
    const day = today.getDay();
    const startOfThisWeek = new Date(today);
    startOfThisWeek.setDate(today.getDate() - day);
    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
    const endOfLastWeek = new Date(startOfThisWeek);
    endOfLastWeek.setDate(endOfLastWeek.getDate() - 1);

    const startDateStr = startOfLastWeek.toISOString().split('T')[0];
    const endDateStr = endOfLastWeek.toISOString().split('T')[0];

    const txResult = await db.query(
      `SELECT t.date, v.name as vendor, t.description, t.amount_cents
       FROM transactions t
       JOIN vendors v ON t.vendor_id = v.id
       WHERE t.date BETWEEN $1 AND $2
       ORDER BY t.date ASC`, 
       [startDateStr, endDateStr]
    );

    const transactions = txResult.rows;

    const budgetResult = await db.query(
      `SELECT amount_cents FROM weekly_budgets WHERE week_start_date = $1`,
      [startDateStr]
    );

    const budgetCents = budgetResult.rows.length > 0 ? budgetResult.rows[0].amount_cents : 0;
    const totalSpendCents = transactions.reduce((sum, tx) => sum + tx.amount_cents, 0);
    const remainingCents = budgetCents - totalSpendCents;

    const currency = amount => `$${(amount / 100).toFixed(2)}`;

    let html = \`
      <div style="font-family: Arial; max-width: 600px; margin: auto;">
        <h2>Weekly Budget Summary (${startDateStr} - ${endDateStr})</h2>
        <p>Initial Budget: \${currency(budgetCents)}</p>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #eee;">
              <th>Date</th>
              <th>Vendor</th>
              <th>Description</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
    \`;

    transactions.forEach(tx => {
      html += \`
        <tr>
          <td>\${tx.date.toISOString().split('T')[0]}</td>
          <td>\${tx.vendor}</td>
          <td>\${tx.description}</td>
          <td>\${currency(tx.amount_cents)}</td>
        </tr>
      \`;
    });

    html += \`
          </tbody>
        </table>
        <p><strong>Total Spend:</strong> \${currency(totalSpendCents)}</p>
        <p><strong>Remaining Budget:</strong> \${currency(remainingCents)}</p>
        \${remainingCents > 0 
          ? '<p style="color: green;">🎉 You stayed under budget!</p>' 
          : '<p style="color: red;">⚠️ Budget exceeded.</p>'
        }
      </div>
    \`;

    const subject = \`Weekly Budget Summary: Week of \${startDateStr} - Total Spend: \${currency(totalSpendCents)}\`;

    const msg = {
      to: process.env.EMAIL_TO,
      from: process.env.EMAIL_FROM,
      subject: subject,
      html: html
    };

    await sgMail.send(msg);

    await db.end();

    return {
      statusCode: 200,
      body: 'Weekly summary email sent successfully.'
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: 'Error sending weekly summary email.'
    };
  }
};
