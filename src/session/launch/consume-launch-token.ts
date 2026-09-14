export function consumeLaunchToken(): string | null {
  const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const accessToken = fragment.get('access_token');

  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
  return accessToken;
}
