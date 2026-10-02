/**
 * Utility per chiamate API autenticate
 */

export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = sessionStorage.getItem('APP_ACCESS_TOKEN');
  
  const headers = {
    ...options.headers,
    'Authorization': token ? `Bearer ${token}` : '',
  };

  return fetch(url, {
    ...options,
    headers,
  });
}

export function getAccessToken(): string | null {
  return sessionStorage.getItem('APP_ACCESS_TOKEN');
}

export function setAccessToken(token: string) {
  sessionStorage.setItem('APP_ACCESS_TOKEN', token);
}

export function clearAccessToken() {
  sessionStorage.removeItem('APP_ACCESS_TOKEN');
}
