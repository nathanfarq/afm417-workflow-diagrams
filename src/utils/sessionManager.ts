const SESSION_KEY = 'audit_flow_session_id';
const SESSION_EXPIRY_HOURS = 24;

export function getOrCreateSessionId(): string {
  let sessionId = localStorage.getItem(SESSION_KEY);

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, sessionId);
  }

  return sessionId;
}

export function getSessionId(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function getSessionExpiryDate(): Date {
  const now = new Date();
  now.setHours(now.getHours() + SESSION_EXPIRY_HOURS);
  return now;
}

export function isSessionExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}
