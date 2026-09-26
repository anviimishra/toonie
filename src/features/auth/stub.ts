import type { AuthAdapter, AuthUser, Credentials } from "./types";

/**
 * Stand-in auth for development, kept until Supabase Auth is wired up.
 *
 * Stores one user in localStorage and ignores passwords entirely. It exists so
 * the rest of the app can ask "who is this?" and get a stable answer, not to
 * provide any security. Every screen that uses it goes through AuthAdapter, so
 * replacing this file is the whole migration.
 */

const KEY = "toonie.stub-user";

function readStored(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

function nameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "friend";
  return local.charAt(0).toUpperCase() + local.slice(1);
}

export function createStubAuth(): AuthAdapter {
  const listeners = new Set<(user: AuthUser | null) => void>();

  function publish(user: AuthUser | null): void {
    if (typeof window !== "undefined") {
      if (user) window.localStorage.setItem(KEY, JSON.stringify(user));
      else window.localStorage.removeItem(KEY);
    }
    for (const listener of listeners) listener(user);
  }

  function make(email: string, displayName: string): AuthUser {
    return {
      // Not a real uuid, and it does not need to be. The server will issue
      // real ids once accounts exist.
      id: "stub-" + email.toLowerCase(),
      displayName,
      email,
    };
  }

  return {
    async currentUser() {
      return readStored();
    },

    async signUp({ email, displayName }: Credentials & { displayName: string }) {
      const user = make(email, displayName.trim() || nameFromEmail(email));
      publish(user);
      return user;
    },

    async signIn({ email }: Credentials) {
      // No password check: this is a stub, and pretending otherwise would be
      // worse than being obvious about it.
      const user = readStored() ?? make(email, nameFromEmail(email));
      publish(user);
      return user;
    },

    async signOut() {
      publish(null);
    },

    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
