import type { Metadata } from "next";
import { LoginScreen } from "@/components/login/LoginScreen";

export const metadata: Metadata = {
  title: "Sign in · Toonie",
};

/**
 * Sign in or create an account. Lives outside the (app) group on purpose, so
 * it has no tab bar: it is the front door, not a room in the house.
 */
export default function LoginPage() {
  return <LoginScreen />;
}
