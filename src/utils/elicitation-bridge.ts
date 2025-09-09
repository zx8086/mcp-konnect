/**
 * Elicitation Bridge - Connects Completed Sessions with Enhanced Operations
 * 
 * Bridges the gap between elicitation tools (Claude Desktop) and enhanced operations
 * while maintaining full compatibility with native MCP elicitation (Claude Code).
 */

import { elicitationManager } from "./elicitation.js";
import { KongDeploymentContext } from "./mcp-elicitation.js";

export interface BridgeSession {
  sessionId: string;
  context: KongDeploymentContext;
  completedAt: Date;
  ttl: number; // Time to live in milliseconds
}

/**
 * Elicitation Bridge - Shared state between elicitation tools and enhanced operations
 */
class ElicitationBridge {
  private completedSessions = new Map<string, BridgeSession>();
  private latestSessionId: string | null = null;
  private sessionTTL = 30 * 60 * 1000; // 30 minutes

  /**
   * Store a completed elicitation session for use by enhanced operations
   */
  setCompletedSession(sessionId: string): void {
    const session = elicitationManager.getSession(sessionId);
    if (!session) {
      console.error(`Session ${sessionId} not found in elicitation manager`);
      return;
    }

    if (!elicitationManager.isSessionComplete(sessionId)) {
      console.error(`Session ${sessionId} is not complete, cannot set as completed`);
      return;
    }

    // Extract context from session responses
    const context = this.extractContextFromSession(sessionId);
    if (!context) {
      console.error(`Failed to extract context from session ${sessionId}`);
      return;
    }

    const bridgeSession: BridgeSession = {
      sessionId,
      context,
      completedAt: new Date(),
      ttl: this.sessionTTL
    };

    this.completedSessions.set(sessionId, bridgeSession);
    this.latestSessionId = sessionId;

    console.error(`SUCCESS: Elicitation bridge: Session ${sessionId} ready for enhanced operations`);
    console.error(`INFO: Context: domain=${context.domain}, environment=${context.environment}, team=${context.team}`);
  }

  /**
   * Get context from the most recent completed session
   */
  getLatestCompletedContext(): KongDeploymentContext | null {
    if (!this.latestSessionId) {
      return null;
    }

    const bridgeSession = this.completedSessions.get(this.latestSessionId);
    if (!bridgeSession) {
      return null;
    }

    // Check if session is still valid (not expired)
    if (this.isSessionExpired(bridgeSession)) {
      console.error(`Session ${this.latestSessionId} expired, removing from bridge`);
      this.completedSessions.delete(this.latestSessionId);
      this.latestSessionId = null;
      return null;
    }

    return bridgeSession.context;
  }

  /**
   * Get context from a specific session
   */
  getSessionContext(sessionId: string): KongDeploymentContext | null {
    const bridgeSession = this.completedSessions.get(sessionId);
    if (!bridgeSession) {
      return null;
    }

    if (this.isSessionExpired(bridgeSession)) {
      this.completedSessions.delete(sessionId);
      return null;
    }

    return bridgeSession.context;
  }

  /**
   * Check if there's a valid completed session available
   */
  hasValidCompletedSession(): boolean {
    return this.getLatestCompletedContext() !== null;
  }

  /**
   * Clear a specific session from the bridge
   */
  clearSession(sessionId: string): void {
    this.completedSessions.delete(sessionId);
    if (this.latestSessionId === sessionId) {
      this.latestSessionId = null;
    }
  }

  /**
   * Clear the latest session (useful after successful deployment)
   */
  clearLatestSession(): void {
    if (this.latestSessionId) {
      this.clearSession(this.latestSessionId);
    }
  }

  /**
   * Get bridge status for debugging
   */
  getBridgeStatus(): {
    latestSessionId: string | null;
    totalSessions: number;
    validSessions: number;
    expiredSessions: number;
  } {
    const allSessions = Array.from(this.completedSessions.values());
    const validSessions = allSessions.filter(s => !this.isSessionExpired(s));
    const expiredSessions = allSessions.length - validSessions.length;

    return {
      latestSessionId: this.latestSessionId,
      totalSessions: this.completedSessions.size,
      validSessions: validSessions.length,
      expiredSessions
    };
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions(): void {
    const expiredSessions: string[] = [];
    
    for (const [sessionId, bridgeSession] of this.completedSessions) {
      if (this.isSessionExpired(bridgeSession)) {
        expiredSessions.push(sessionId);
      }
    }

    expiredSessions.forEach(sessionId => {
      this.completedSessions.delete(sessionId);
      if (this.latestSessionId === sessionId) {
        this.latestSessionId = null;
      }
    });

    if (expiredSessions.length > 0) {
      console.error(`INFO: Cleaned up ${expiredSessions.length} expired elicitation sessions`);
    }
  }

  private extractContextFromSession(sessionId: string): KongDeploymentContext | null {
    try {
      const responses = elicitationManager.getSessionResponses(sessionId);
      const context: Partial<KongDeploymentContext> = {};

      // Extract domain, environment, team from responses
      let domain: string | null = null;
      let environment: string | null = null;
      let team: string | null = null;

      // Get responses in order they were created
      const responseArray = Array.from(responses.values());
      
      // Based on the elicitation pattern: domain, environment, team
      if (responseArray.length >= 1 && responseArray[0].data) {
        domain = typeof responseArray[0].data === 'string' ? responseArray[0].data : responseArray[0].data.domain;
      }
      if (responseArray.length >= 2 && responseArray[1].data) {
        environment = typeof responseArray[1].data === 'string' ? responseArray[1].data : responseArray[1].data.environment;
      }
      if (responseArray.length >= 3 && responseArray[2].data) {
        team = typeof responseArray[2].data === 'string' ? responseArray[2].data : responseArray[2].data.team;
      }

      // Also try to extract from object responses
      for (const response of responseArray) {
        if (response.data && typeof response.data === 'object') {
          if (response.data.domain && !domain) domain = response.data.domain;
          if (response.data.environment && !environment) environment = response.data.environment;
          if (response.data.team && !team) team = response.data.team;
        }
      }

      // Validate we have all required fields
      if (!domain || !environment || !team) {
        console.error(`ERROR: Incomplete context extracted from session ${sessionId}:`, {
          domain, environment, team
        });
        return null;
      }

      // Normalize values
      context.domain = domain.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-');
      context.environment = environment.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-');
      context.team = team.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-');

      console.error(`SUCCESS: Context extracted from session ${sessionId}:`, context);
      return context as KongDeploymentContext;

    } catch (error) {
      console.error(`Failed to extract context from session ${sessionId}:`, error);
      return null;
    }
  }

  private isSessionExpired(bridgeSession: BridgeSession): boolean {
    return (Date.now() - bridgeSession.completedAt.getTime()) > bridgeSession.ttl;
  }
}

/**
 * Global elicitation bridge instance
 */
export const elicitationBridge = new ElicitationBridge();

// Auto-cleanup expired sessions every 5 minutes
setInterval(() => {
  elicitationBridge.cleanupExpiredSessions();
}, 5 * 60 * 1000);