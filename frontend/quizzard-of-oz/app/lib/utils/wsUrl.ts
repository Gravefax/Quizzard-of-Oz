export function getWsUrl(path: string): string {
  const wsBaseFromEnv = process.env.NEXT_PUBLIC_WS_BASE;
  if (wsBaseFromEnv) {
    return `${wsBaseFromEnv.replace(/\/$/, '')}${path}`;
  }

  const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? '/api';
  if (apiBase.startsWith('/')) {
    const protocol = globalThis.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${protocol}://${globalThis.location.host}${apiBase}${path}`;
  }

  const wsBase = apiBase.replace(/^https/, 'wss').replace(/^http/, 'ws');
  return `${wsBase}${path}`;
}
