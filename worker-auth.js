// Cloudflare Worker for KH VFX Tracker auth links with OG previews
// Deploy: Cloudflare Dashboard → Workers → Create → paste this code
// Set route or use *.workers.dev subdomain

const SITE_URL = 'https://spark700.github.io/kh-vfx-tracker/';
const OG_IMAGE = 'https://pub-5562d3ff4b084ba7824a7ebe61f9466a.r2.dev/thumbs/KH_01_198.jpg';
const R2_CDN = 'https://pub-5562d3ff4b084ba7824a7ebe61f9466a.r2.dev';

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // CORS proxy: /r2/* → fetch from R2 CDN with CORS headers
    if (url.pathname.startsWith('/r2/')) {
      const r2Path = url.pathname.substring(4); // strip /r2/
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Max-Age': '86400',
          }
        });
      }
      const r2Resp = await fetch(R2_CDN + '/' + r2Path, { method: request.method });
      const resp = new Response(r2Resp.body, {
        status: r2Resp.status,
        headers: {
          'Content-Type': r2Resp.headers.get('Content-Type') || 'application/octet-stream',
          'Content-Length': r2Resp.headers.get('Content-Length') || '',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=3600',
        }
      });
      return resp;
    }

    const authParam = url.searchParams.get('auth');

    if (!authParam && !url.pathname.startsWith('/r2/')) {
      // No auth param — redirect to site
      return Response.redirect(SITE_URL, 302);
    }

    // Extract username from format: USERNAME_xxxx_USERNAME_xxxx_USERNAME
    const parts = authParam.split('_');
    const username = parts[0] || 'User';
    const displayName = username.charAt(0).toUpperCase() + username.slice(1).toLowerCase();

    // Redirect URL
    const redirectUrl = SITE_URL + '?auth=' + encodeURIComponent(authParam);

    // Check if request is from a bot (Telegram, etc.)
    const ua = request.headers.get('user-agent') || '';
    const isBot = /TelegramBot|WhatsApp|Slack|Discord|facebook|Twitter|LinkedInBot|Googlebot/i.test(ua);

    if (isBot) {
      // Return HTML with OG tags for bots
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta property="og:title" content="KILLHOUSE VFX Tracker">
  <meta property="og:description" content="Login as ${displayName}">
  <meta property="og:image" content="${OG_IMAGE}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${redirectUrl}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="KILLHOUSE VFX Tracker">
  <meta name="twitter:description" content="Login as ${displayName}">
  <meta name="twitter:image" content="${OG_IMAGE}">
  <title>KILLHOUSE VFX — ${displayName}</title>
</head>
<body></body>
</html>`;
      return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // For real users — redirect to GitHub Pages
    return Response.redirect(redirectUrl, 302);
  },
};
