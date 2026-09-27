"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { RobotMood, RobotState } from "@/lib/supabase/types";

/**
 * The robot's shared state, kept in Supabase (`robot_states`).
 *
 * - Reads its row and watches it over Realtime, so when anything sets
 *   `mail_received` to true (a delivered comic, the grown-up's phone, the
 *   dashboard) the face reacts immediately.
 * - Writes go through /api/robot-state, since only the server may write.
 *
 * If the table isn't there yet (migration not applied) it logs once and keeps
 * working with local state, so the face still runs.
 */
export function useRobotState(robotId = "default") {
  const [mailReceived, setMailLocal] = useState(false);
  const mailRef = useRef(mailReceived);

  useEffect(() => {
    mailRef.current = mailReceived;
  }, [mailReceived]);

  useEffect(() => {
    const supabase = supabaseBrowser();
    let active = true;

    supabase
      .from("robot_states")
      .select("*")
      .eq("id", robotId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.warn("[robot-state] can't read Supabase, using local state only", error.message);
          return;
        }
        if (data) setMailLocal(data.mail_received);
      });

    const channel = supabase
      .channel(`robot_states:${robotId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "robot_states", filter: `id=eq.${robotId}` },
        (payload) => {
          const row = payload.new as Partial<RobotState>;
          if (typeof row.mail_received === "boolean") setMailLocal(row.mail_received);
        },
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [robotId]);

  const save = useCallback(
    (patch: { mood?: RobotMood; mailReceived?: boolean }) => {
      fetch("/api/robot-state", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: robotId, ...patch }),
      })
        .then(async (response) => {
          if (!response.ok) {
            const { error } = await response.json().catch(() => ({ error: response.status }));
            console.warn("[robot-state] save failed", error);
          }
        })
        .catch((error) => console.warn("[robot-state] save failed", String(error)));
    },
    [robotId],
  );

  /** Show or clear the mail face. Updates the screen now, then saves. */
  const setMailReceived = useCallback(
    (value: boolean) => {
      setMailLocal(value);
      save({ mailReceived: value });
    },
    [save],
  );

  const toggleMail = useCallback(() => setMailReceived(!mailRef.current), [setMailReceived]);
  const clearMail = useCallback(() => setMailReceived(false), [setMailReceived]);

  /** Record what the face is showing, for anyone watching the row. */
  const reportMood = useCallback((mood: RobotMood) => save({ mood }), [save]);

  return { mailReceived, setMailReceived, toggleMail, clearMail, reportMood };
}
