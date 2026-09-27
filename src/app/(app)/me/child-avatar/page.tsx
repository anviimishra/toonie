"use client";

import { AvatarEditor } from "@/components/me/AvatarEditor";
import { childAvatars } from "@/features/avatar";

/** Settings → Child's avatar: how your kid appears in the comics. */
export default function ChildAvatarPage() {
  return (
    <AvatarEditor
      store={childAvatars}
      title="Your child's avatar"
      subtitle="How your kid shows up in the comics."
      portraitLabel="Your child's saved avatar"
    />
  );
}
