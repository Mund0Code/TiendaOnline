// src/lib/cookies.js

/**
 * Parse a Cookie header string into an object.
 * @param {string} cookieHeader The raw Cookie header.
 * @returns {Record<string, string>} Map of cookie names to values.
 */
export function parseCookies(cookieHeader) {
  return cookieHeader
    .split(";")
    .map((v) => v.trim())
    .filter((v) => v.includes("="))
    .reduce((acc, pair) => {
      const [key, ...rest] = pair.split("=");
      acc[key] = decodeURIComponent(rest.join("="));
      return acc;
    }, {});
}

/**
 * Extract cookies from an Astro request.
 * @param {import('astro').AstroRequest} request
 * @returns {Record<string, string>}
 */
export function getCookiesFromRequest(request) {
  // In Astro, request.headers is a Fetch API Headers instance
  const cookieHeader = request.headers.get("cookie") || "";
  return parseCookies(cookieHeader);
}
