"use client";

import { useCallback, useState } from "react";

/**
 * Whether a comic is waiting for the receiver screen.
 *
 * Local state for now, flipped by hand while developing. When comics are
 * delivered for real, this is the one place to subscribe to them (e.g. a
 * Supabase Realtime channel) and set `mailReceived` to true; the screen
 * doesn't need to change.
 */
export function useMailbox() {
  const [mailReceived, setMailReceived] = useState(false);
  const clearMail = useCallback(() => setMailReceived(false), []);
  return { mailReceived, setMailReceived, clearMail };
}
