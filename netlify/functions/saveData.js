export async function handler(event) {
  const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzXFTEU7PPq5Yg1CSbOPAKqImlgdew9eloNJ7ia0pN0AFFCiHZxa30nJl2UACqtj1hX6w/exec";

  if (event.httpMethod === "POST") {
    const res = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: event.body,
    });
    const json = await res.json();
    return {
      statusCode: 200,
      body: JSON.stringify(json),
    };
  }

  if (event.httpMethod === "GET") {
    const res = await fetch(GOOGLE_SCRIPT_URL);
    const json = await res.json();
    return {
      statusCode: 200,
      body: JSON.stringify(json),
    };
  }

  return { statusCode: 405, body: "Method Not Allowed" };
}