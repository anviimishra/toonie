import { ComingSoon } from "@/components/ComingSoon";
import { ComicsIcon } from "@/components/icons";

export default function FeedPage() {
  return (
    <ComingSoon
      Icon={ComicsIcon}
      title="Your comics"
      body="Comics people send you will show up here."
    />
  );
}
