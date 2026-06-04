# FatSecret API Proxy Setup

This proxy handles OAuth 2.0 authentication with FatSecret's API and adds CORS headers so your frontend can use it directly.

## Step 1: Get FatSecret API Credentials

1. Go to [https://platform.fatsecret.com/](https://platform.fatsecret.com/)
2. Sign up for a **free** developer account
3. Create a new application
4. Copy your **Client ID** and **Client Secret**

## Step 2: Deploy the Proxy (Cloudflare Workers — Free)

### Install Wrangler (Cloudflare CLI)
```bash
npm install -g wrangler
```

### Login to Cloudflare
```bash
wrangler login
```

### Set your API secrets
```bash
cd fatsecret-proxy
wrangler secret put FATSECRET_CLIENT_ID
# Paste your Client ID when prompted

wrangler secret put FATSECRET_CLIENT_SECRET
# Paste your Client Secret when prompted
```

### Deploy
```bash
wrangler deploy
```

You'll get a URL like: `https://fatsecret-proxy.YOUR-SUBDOMAIN.workers.dev`

## Step 3: Configure the Frontend

Open `script/fatSecretAPI.js` and set the `proxyUrl`:

```javascript
const FATSECRET_CONFIG = {
  clientId: "",       // Leave empty when using proxy
  clientSecret: "",   // Leave empty when using proxy
  proxyUrl: "https://fatsecret-proxy.YOUR-SUBDOMAIN.workers.dev",
};
```

## Done! 🎉

The "🍽️ FatSecret" button on the meal page will now search FatSecret's database.

---

## Alternative: Direct Mode (No Proxy)

If you're running the app in an environment without CORS restrictions (e.g., Electron, mobile app, or with a browser extension that disables CORS), you can set credentials directly:

```javascript
const FATSECRET_CONFIG = {
  clientId: "YOUR_CLIENT_ID",
  clientSecret: "YOUR_CLIENT_SECRET",
  proxyUrl: "",  // Empty = direct mode
};
```

⚠️ **Warning:** Never expose API secrets in production frontend code!

---

## API Limits (Free Tier)

- FatSecret free tier: ~5,000 API calls/day
- Cloudflare Workers free tier: 100,000 requests/day
- The proxy caches responses for 5 minutes to reduce API usage

