/**
 * Local API Proxy Server
 * Handles OAuth + CORS for FatSecret API calls,
 * and proxies Willys.se search requests (CORS-blocked from browser).
 *
 * Usage: node fatsecret-proxy/local-proxy.js
 * Runs on: http://localhost:8081
 *
 * Endpoints:
 *   /?method=foods.search&...  → FatSecret API
 *   /willys?q=kycklingbröst    → Willys.se search
 */

const http = require("http");
const https = require("https");

const CLIENT_ID = "375c33984a444db6860873f8237f0094";
const CLIENT_SECRET = "8c4f122ee0dd481d83cd9955be4ae7f1";

const TOKEN_URL = "https://oauth.fatsecret.com/connect/token";
const API_URL = "https://platform.fatsecret.com/rest/server.api";
const PORT = 8081;

let cachedToken = null;
let tokenExpiry = 0;

function httpsRequest(url, options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on("error", reject);
    if (postData) req.write(postData);
    req.end();
  });
}

/**
 * Simple HTTPS GET that returns raw JSON
 */
function httpsGet(targetUrl) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(targetUrl);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; CalorieCounter/1.0)",
        "Accept": "application/json",
      },
    };
    https.get(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    }).on("error", reject);
  });
}

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
  const postData = "grant_type=client_credentials&scope=basic";
  const url = new URL(TOKEN_URL);

  const result = await httpsRequest(url, {
    method: "POST",
    hostname: url.hostname,
    path: url.pathname,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${credentials}`,
      "Content-Length": Buffer.byteLength(postData),
    },
  }, postData);

  if (result.status !== 200) {
    throw new Error(`Token request failed: ${result.status}`);
  }

  cachedToken = result.data.access_token;
  tokenExpiry = Date.now() + (result.data.expires_in - 60) * 1000;
  console.log("✅ Got FatSecret access token (expires in", result.data.expires_in, "seconds)");
  return cachedToken;
}

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== "GET") {
    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  try {
    const reqUrl = new URL(req.url, `http://localhost:${PORT}`);

    // ── Willys proxy ──────────────────────────────────────────
    if (reqUrl.pathname === "/willys") {
      const query = reqUrl.searchParams.get("q");
      if (!query) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing 'q' parameter" }));
        return;
      }

      const willysUrl = `https://www.willys.se/search?q=${encodeURIComponent(query)}`;
      console.log(`🏪 Willys search: "${query}"`);

      const result = await httpsGet(willysUrl);

      res.writeHead(result.status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result.data));
      return;
    }

    // ── FatSecret proxy ───────────────────────────────────────
    const method = reqUrl.searchParams.get("method");

    if (!method) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Missing 'method' parameter. Use /?method=... for FatSecret or /willys?q=... for Willys." }));
      return;
    }

    const token = await getAccessToken();

    // Build FatSecret API URL
    const apiUrl = new URL(API_URL);
    for (const [key, value] of reqUrl.searchParams.entries()) {
      apiUrl.searchParams.set(key, value);
    }
    apiUrl.searchParams.set("format", "json");

    console.log(`📡 FatSecret API: ${method} →`, apiUrl.searchParams.get("search_expression") || apiUrl.searchParams.get("food_id") || "");

    const result = await httpsRequest(apiUrl, {
      hostname: apiUrl.hostname,
      path: `${apiUrl.pathname}?${apiUrl.searchParams.toString()}`,
      headers: { "Authorization": `Bearer ${token}` },
    });

    res.writeHead(result.status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(result.data));
  } catch (err) {
    console.error("❌ Proxy error:", err.message);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err.message }));
  }
});

server.listen(PORT, () => {
  console.log(`\n🍽️  API Proxy running at http://localhost:${PORT}`);
  console.log("   /?method=...        → FatSecret API");
  console.log("   /willys?q=...       → Willys.se product search");
  console.log("   Ready to handle API requests from your frontend.\n");
});

