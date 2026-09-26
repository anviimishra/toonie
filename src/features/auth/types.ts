/**
 * Auth, behind one interface.
 *
 * Nothing in the UI talks to an auth provider directly, so swapping the stub
 * for Supabase Auth is a one-file change that no screen has to notice. The
 * shape is deliberately Supabase-shaped -- email, password, a change
 * subscription -- so the real adapter is a thin wrapper rather than a rewrite.
 */

export type AuthUser = {
  id: string;
  /** What we call them in the app and on a comic. */
  displayName: string;
  email: string | null;
};

export type Credentials = {
  email: string;
  password: string;
};

export interface AuthAdapter {
  /** The signed-in user, or null. */
  currentUser(): Promise<AuthUser | null>;
  signUp(input: Credentials & { displayName: string }): Promise<AuthUser>;
  signIn(input: Credentials): Promise<AuthUser>;
  signOut(): Promise<void>;
  /** Subscribe to sign-in and sign-out. Returns an unsubscribe function. */
  onChange(listener: (user: AuthUser | null) => void): () => void;
}
