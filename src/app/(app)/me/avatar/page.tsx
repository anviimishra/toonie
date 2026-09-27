"use client";

import { AvatarEditor } from "@/components/me/AvatarEditor";
import { avatars } from "@/features/avatar";

/** Settings → My avatar: the grown-up's character in every comic they send. */
export default function MyAvatarPage() {
  return (
    <AvatarEditor
      role="parent"
      store={avatars}
      title="Your avatar"
      subtitle="The star of every comic you make."
      portraitLabel="Your saved avatar"
    />
  );
}
