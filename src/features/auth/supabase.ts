import type { User } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { AuthAdapter, AuthUser } from "./types";
export function appUser(user: User | null): AuthUser | null {
  if (!user || user.is_anonymous) return null;
  return {
    id: user.id,
    email: user.email ?? null,
    displayName: String(user.user_metadata?.display_name || user.email?.split("@")[0] || "Parent"),
  };
}
export const supabaseAuth: AuthAdapter = {
  async currentUser() {
    const { data, error } = await supabaseBrowser().auth.getUser();
    if (error) return null;
    return appUser(data.user);
  },
  async signUp({ email, password, displayName }) {
    const { data, error } = await supabaseBrowser().auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName }, emailRedirectTo: `${location.origin}/login` },
    });
    if (error) throw error;
    if (!data.session) return null;
    return appUser(data.user);
  },
  async signIn(credentials) {
    const { data, error } = await supabaseBrowser().auth.signInWithPassword(credentials);
    if (error) throw error;
    const user = appUser(data.user);
    if (!user) throw new Error("Sign in with a parent account.");
    return user;
  },
  async signOut() {
    const { error } = await supabaseBrowser().auth.signOut();
    if (error) throw error;
  },
  onChange(listener) {
    const { data } = supabaseBrowser().auth.onAuthStateChange((_event, session) =>
      listener(appUser(session?.user ?? null)),
    );
    return () => data.subscription.unsubscribe();
  },
};
