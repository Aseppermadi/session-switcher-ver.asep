export const MESSAGE_ACTIONS = {
  GET_CURRENT_SESSION: "getCurrentSession",
  SWITCH_SESSION: "switchSession",
  CLEAR_SESSION: "clearSession",
  // GET_CURRENT_DOMAIN removed - now using URL parameters
  CLEAR_SESSIONS: "clearSessions",
  EXPORT_SESSIONS: "exportSessions",
  IMPORT_SESSIONS: "importSessions",
} as const;
