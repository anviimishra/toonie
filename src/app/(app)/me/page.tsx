import { ComingSoon } from "@/components/ComingSoon";
import { FaceIcon } from "@/components/icons";

export default function MePage() {
  return (
    <ComingSoon
      Icon={FaceIcon}
      title="Your avatar"
      body="Snap a selfie or build a character to star in your comics."
    />
  );
}
