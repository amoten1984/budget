
const { Client } = require('pg');
const sgMail = require('@sendgrid/mail');

exports.handler = async function(event, context) {
  console.log("Function invoked");

  if (!process.env.SENDGRID_API_KEY) {
    console.error("Missing SENDGRID_API_KEY");
    return { statusCode: 500, body: "Server error: missing SENDGRID_API_KEY" };
  }

  if (!process.env.NEON_DB_URL) {
    console.error("Missing NEON_DB_URL");
    return { statusCode: 500, body: "Server error: missing NEON_DB_URL" };
  }

  if (!process.env.EMAIL_TO || !process.env.EMAIL_FROM) {
    console.error("Missing EMAIL_TO or EMAIL_FROM");
    return { statusCode: 500, body: "Server error: missing EMAIL_TO or EMAIL_FROM" };
  }

  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log("SendGrid API Key initialized");

  const db = new Client({
    connectionString: process.env.NEON_DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log("Connecting to database...");
    await db.connect();
    console.log("Database connected");

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

    console.log(`Querying transactions from ${startDateStr} to ${endDateStr}`);

    const txResult = await db.query(
      `SELECT t.date, v.name as vendor, t.description, t.amount_cents
       FROM transactions t
       JOIN vendors v ON t.vendor_id = v.id
       WHERE t.date BETWEEN $1 AND $2
       ORDER BY t.date ASC`, 
       [startDateStr, endDateStr]
    );

    console.log(`Fetched ${txResult.rows.length} transactions`);

    const transactions = txResult.rows;

    const budgetResult = await db.query(
      `SELECT amount_cents FROM weekly_budgets WHERE week_start_date = $1`,
      [startDateStr]
    );

    const budgetCents = budgetResult.rows.length > 0 ? budgetResult.rows[0].amount_cents : 0;
    const totalSpendCents = transactions.reduce((sum, tx) => sum + tx.amount_cents, 0);
    const remainingCents = budgetCents - totalSpendCents;

    const currency = amount => `$${(amount / 100).toFixed(2)}`;

    let html = `
      <div style="font-family: Arial; max-width: 600px; margin: auto;">
        <h2>Weekly Budget Summary (${startDateStr} - ${endDateStr})</h2>
        <p>Initial Budget: ${currency(budgetCents)}</p>
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
    `;

    transactions.forEach(tx => {
      html += `
        <tr>
          <td>${tx.date.toISOString().split('T')[0]}</td>
          <td>${tx.vendor}</td>
          <td>${tx.description}</td>
          <td>${currency(tx.amount_cents)}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
        <p><strong>Total Spend:</strong> ${currency(totalSpendCents)}</p>
        <p><strong>Remaining Budget:</strong> ${currency(remainingCents)}</p>
        ${remainingCents > 0 
          ? '<p style="color: green;">🎉 You stayed under budget!</p>' 
          : '<p style="color: red;">⚠️ Budget exceeded.</p>'
        }
      </div>
    `;

    const subject = `Weekly Budget Summary: Week of ${startDateStr} - Total Spend: ${currency(totalSpendCents)}`;

    const msg = {
      to: process.env.EMAIL_TO,
      from: process.env.EMAIL_FROM,
      subject: subject,
      html: html
    };

    console.log("Sending email...");
    await sgMail.send(msg);
    console.log("Email sent successfully");

    await db.end();
    console.log("Database connection closed");

    return {
      statusCode: 200,
      body: 'Manual test: Weekly summary email sent successfully.'
    };
  } catch (err) {
    console.error("Error occurred:", err);
    return {
      statusCode: 500,
      body: 'Manual test: Error sending weekly summary email.'
    };
  }
};
