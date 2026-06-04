/**
 * FatSecret API Proxy — Cloudflare Worker
 *
 * This worker handles OAuth 2.0 authentication with FatSecret
 * and proxies API requests, adding CORS headers so your frontend can call it.
 *
 * Deploy to Cloudflare Workers (free tier: 100,000 requests/day)
 *
 * Setup:
 * 1. Install Wrangler: npm install -g wrangler
 * 2. Login: wrangler login
 * 3. Set secrets:
 *    wrangler secret put FATSECRET_CLIENT_ID
 *    wrangler secret put FATSECRET_CLIENT_SECRET
 * 4. Deploy: wrangler deploy
 */

const TOKEN_URL = "https://oauth.fatsecret.com/connect/token";
const API_URL = "https://platform.fatsecret.com/rest/server.api";

// Cache the access token in memory (per worker instance)
let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken(env) {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const credentials = btoa(`${env.FATSECRET_CLIENT_ID}:${env.FATSECRET_CLIENT_SECRET}`);

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${credentials}`,
    },
    body: "grant_type=client_credentials&scope=basic",
  });

  if (!response.ok) {
    throw new Error(`Token request failed: ${response.status}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken;
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "*";

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== "GET") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    try {
      const url = new URL(request.url);
      const method = url.searchParams.get("method");

      if (!method) {
        return new Response(JSON.stringify({ error: "Missing 'method' parameter" }), {
          status: 400,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      }

      // Get OAuth token
      const token = await getAccessToken(env);

      // Build FatSecret API request
      const apiUrl = new URL(API_URL);
      for (const [key, value] of url.searchParams.entries()) {
        apiUrl.searchParams.set(key, value);
      }
      apiUrl.searchParams.set("format", "json");

      const apiResponse = await fetch(apiUrl.toString(), {
        headers: { "Authorization": `Bearer ${token}` },
      });

      const data = await apiResponse.json();

      return new Response(JSON.stringify(data), {
        status: apiResponse.status,
        headers: {
          ...corsHeaders(origin),
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300", // Cache 5 minutes
        },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }
  },
};

