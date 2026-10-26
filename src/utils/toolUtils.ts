/**
 * Utility helpers for tool argument normalization and validation.
 */

export function sanitizeUrl(urlStr: string): string {
  if (!urlStr) return 'https://google.com';
  let trimmed = urlStr.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = 'https://' + trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.href;
  } catch {
    return `https://www.google.com/search?q=${encodeURIComponent(urlStr)}`;
  }
}

export function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
