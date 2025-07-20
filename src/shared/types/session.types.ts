export interface SessionData extends StoredSession {
  id: string;
  name: string;
  order: number;
  domain: string;
  createdAt: number;
  lastUsed: number;
}

export interface StoredSession {
  cookies: chrome.cookies.Cookie[];
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
}

export interface ActiveSessions {
  [domain: string]: string; // domain -> sessionId
}
