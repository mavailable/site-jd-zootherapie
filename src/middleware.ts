import { defineMiddleware } from 'astro:middleware';

const staticHeaders: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

const keystatioCsp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https: ",
  "font-src 'self' https:",
  "connect-src 'self' https:",
  "frame-src 'self' https:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join('; ');

/** Compute SHA-256 hash of inline script content for CSP */
async function sha256(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const base64 = btoa(String.fromCharCode(...hashArray));
  return `'sha256-${base64}'`;
}

/** Extract inline script contents from HTML (skip type=application/ld+json) */
function extractInlineScripts(html: string): string[] {
  const scripts: string[] = [];
  const regex = /<script(?![^>]*\ssrc=)(?![^>]*type=["']application\/ld\+json["'])[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const content = match[1].trim();
    if (content) scripts.push(content);
  }
  return scripts;
}

/** Build CSP with SHA-256 hashes for inline scripts instead of unsafe-inline */
async function buildCsp(html: string): Promise<string> {
  const inlineScripts = extractInlineScripts(html);
  const hashes = await Promise.all(inlineScripts.map(sha256));

  const scriptSrc = ["'self'", ...hashes, 'https://cloud.umami.is'].join(' ');

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self'",
    "connect-src 'self' https://cloud.umami.is https://api-gateway.umami.dev https://api.web3forms.com https://nominatim.openstreetmap.org https://router.project-osrm.org",
    "frame-src 'self' https://cloud.umami.is",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://api.web3forms.com",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join('; ');
}

export const onRequest = defineMiddleware(async (_context, next) => {
  const response = await next();
  const url = new URL(_context.request.url);

  // Static security headers on all responses
  for (const [key, value] of Object.entries(staticHeaders)) {
    response.headers.set(key, value);
  }

  // CSP: Keystatic + aide privee utilisent unsafe-inline, autres pages = hashes stricts
  if (url.pathname.startsWith('/keystatic') || url.pathname.startsWith('/aide-')) {
    response.headers.set('Content-Security-Policy', keystatioCsp);
  } else {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      const html = await response.text();
      const csp = await buildCsp(html);
      response.headers.set('Content-Security-Policy', csp);
      return new Response(html, response);
    }
  }

  return response;
});
