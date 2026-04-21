export function getWsUrl(path: string): string {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? `${globalThis.location?.protocol}//${globalThis.location?.host}`;
  const wsBase = apiBase.replace(/^https/, 'wss').replace(/^http/, 'ws');
  return `${wsBase.replace(/\/$/, '')}${path}`;
}
