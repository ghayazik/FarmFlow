// Netlify Function: /.netlify/functions/chat
// Configure ANTHROPIC_API_KEY in Netlify dashboard > Site configuration > Environment variables

const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: { message: "POST only" } }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: { message: "ANTHROPIC_API_KEY not set. Add it in Netlify > Site configuration > Environment variables." } }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: { message: "Invalid JSON body" } }) };
  }

  const payload = {
    model: body.model || "claude-sonnet-4-20250514",
    max_tokens: Math.min(parseInt(body.max_tokens) || 1000, 4096),
    messages: Array.isArray(body.messages) ? body.messages.slice(-10) : []
  };

  if (body.system && typeof body.system === "string") {
    payload.system = body.system;
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(payload)
    });

    const text = await res.text();
    return { statusCode: res.status, headers, body: text };

  } catch (err) {
    return { statusCode: 502, headers, body: JSON.stringify({ error: { message: "API call failed: " + err.message } }) };
  }
};

module.exports = { handler };
