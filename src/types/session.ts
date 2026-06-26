/**
 * Local demo-session model.
 *
 * SiteFlow AI has no backend yet, so there is no real authentication, no access
 * token, and no JWT. This record represents a **local, clearly-labelled demo
 * session** only. It is the single source of truth for "is someone signed in"
 * on the client; it grants no server-side authority of any kind.
 *
 * SECURITY: real authorization (role, company membership, resource ownership)
 * must be enforced by the future Spring Boot backend. A `DemoSession` is a
 * user-experience / local-session boundary, never a trust boundary. It must
 * never carry a password, token, or any backend secret.
 */

/** Discriminates how a session was established. Only local demo for now. */
export type SessionMode = 'DEMO';

export interface DemoSession {
  /** Stable id for this session instance. */
  id: string;
  /** Identifier for the local demo user. */
  userId: string;
  /** Human-readable name shown in the UI. */
  displayName: string;
  /** Optional display email. Never a credential — demo mode needs no password. */
  email?: string;
  /** Always `DEMO`; makes the non-production nature explicit at every use site. */
  mode: SessionMode;
  /** ISO timestamp of when the demo session was created. */
  createdAt: string;
}
