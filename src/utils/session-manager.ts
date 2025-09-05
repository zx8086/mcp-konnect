/**
 * Session Management System for MCP Server
 * Implements AsyncLocalStorage for context propagation and session grouping
 * Based on the proven patterns from LANGSMITH_TRACING_IMPLEMENTATION.md
 */

import { AsyncLocalStorage } from "node:async_hooks";

export interface SessionContext {
  sessionId: string;           // Unique session identifier
  connectionId: string;        // Connection-specific ID
  transportMode: "stdio" | "sse";
  startTime: number;
  clientInfo?: {
    name?: string;
    version?: string;
    userAgent?: string;
  };
  userId?: string;
  toolCallCount?: number;
  metadata?: Record<string, any>;
}

// Global session storage using AsyncLocalStorage
const sessionStorage = new AsyncLocalStorage<SessionContext>();

/**
 * Run operations within session context
 */
export function runWithSession<T>(context: SessionContext, fn: () => T | Promise<T>): T | Promise<T> {
  return sessionStorage.run(context, fn);
}

/**
 * Get current session from any nested operation
 */
export function getCurrentSession(): SessionContext | undefined {
  const session = sessionStorage.getStore();
  if (!session) {
    console.error("No session context available in AsyncLocalStorage");
  }
  return session;
}

/**
 * Get session ID from current context
 */
export function getCurrentSessionId(): string | undefined {
  return getCurrentSession()?.sessionId;
}

/**
 * Get client info from current context
 */
export function getCurrentClientInfo(): SessionContext["clientInfo"] | undefined {
  return getCurrentSession()?.clientInfo;
}

/**
 * Create a session context object
 */
export function createSessionContext(
  connectionId: string,
  transportMode: "stdio" | "sse",
  sessionId?: string,
  clientInfo?: SessionContext["clientInfo"],
  userId?: string,
): SessionContext {
  return {
    sessionId: sessionId || connectionId,
    connectionId,
    transportMode,
    startTime: Date.now(),
    clientInfo,
    userId,
    toolCallCount: 0,
    metadata: {},
  };
}

/**
 * Generates a session ID based on connection context
 */
export function generateSessionId(connectionId: string, clientInfo?: { name?: string }): string {
  const timestamp = Date.now();
  const clientPrefix = clientInfo?.name?.toLowerCase().replace(/\s+/g, "-") || "unknown";
  const shortId = connectionId.substring(0, 6);
  
  return `${clientPrefix}-${timestamp}-${shortId}`;
}

/**
 * Detect client based on transport mode and environment
 */
export function detectClient(transportMode: "stdio" | "sse"): SessionContext["clientInfo"] {
  if (transportMode === "stdio") {
    // Most likely Claude Desktop or CLI tools
    return {
      name: "Claude Desktop",
      version: "unknown",
      userAgent: "claude-desktop"
    };
  } else {
    // SSE likely means web client
    return {
      name: "Web Client", 
      version: "unknown",
      userAgent: "web-client"
    };
  }
}

/**
 * Log session info for debugging
 */
export function logSessionInfo(prefix = "Session Info") {
  const session = getCurrentSession();
  if (session) {
    console.error(`${prefix}:`, {
      sessionId: `${session.sessionId?.substring(0, 10)}...`,
      connectionId: `${session.connectionId?.substring(0, 10)}...`,
      client: session.clientInfo?.name || "unknown",
      transport: session.transportMode,
      duration: session.startTime ? Date.now() - session.startTime : 0,
      toolCallCount: session.toolCallCount || 0
    });
  } else {
    console.error(`${prefix}: No active session`);
  }
}

/**
 * Session cleanup on connection close
 */
export function cleanupSession(sessionId: string) {
  console.error("Cleaning up session", { sessionId });
  
  const session = getCurrentSession();
  if (session?.startTime) {
    const duration = Date.now() - session.startTime;
    console.error("Session ended", {
      sessionId,
      duration,
      clientName: session.clientInfo?.name,
      toolCallCount: session.toolCallCount || 0,
    });
  }
}

/**
 * Increment tool call counter for current session
 */
export function incrementToolCallCount() {
  const session = getCurrentSession();
  if (session) {
    session.toolCallCount = (session.toolCallCount || 0) + 1;
  }
}

/**
 * Creates properly named session traces for better identification
 */
export function createNamedConnectionTrace(context: SessionContext): string {
  let traceName = "MCP Connection";
  
  // Client identification
  if (context.clientInfo?.name) {
    const clientName = context.clientInfo.name.replace(/[^a-zA-Z0-9\s]/g, '').trim();
    traceName = `${clientName}`;
  }
  
  // Transport mode and session identifier
  traceName += ` (${context.transportMode.toUpperCase()})`;
  
  if (context.sessionId) {
    const sessionParts = context.sessionId.split("-");
    const sessionIdentifier = sessionParts.length > 2
      ? sessionParts[sessionParts.length - 1].substring(0, 6)
      : context.sessionId.substring(0, 8);
    traceName += ` [${sessionIdentifier}]`;
  }
  
  return traceName;
}