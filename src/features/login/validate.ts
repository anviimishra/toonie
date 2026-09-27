/**
 * Checks for the login screen, kept apart from the UI so they are easy to test
 * and so the Supabase adapter can reuse the same rules later.
 *
 * Every check returns a friendly sentence, or null when the value is fine.
 */

export type LoginMode = "signIn" | "signUp";

export type LoginFields = {
  email: string;
  password: string;
  displayName: string;
};

export type LoginField = keyof LoginFields;

export type LoginErrors = Partial<Record<LoginField, string>>;

export const PASSWORD_MIN_LENGTH = 6;
export const DISPLAY_NAME_MAX_LENGTH = 40;

// Deliberately loose: something@something.tld, no spaces. The real check is
// whether the email arrives, and that is the auth provider's job.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function checkEmail(value: string): string | null {
  const email = value.trim();
  if (email === "") return "We need your email to find your comics.";
  if (!EMAIL_PATTERN.test(email)) return "That email looks a little off. Mind checking it?";
  return null;
}

export function checkPassword(value: string): string | null {
  if (value === "") return "Pop in a password.";
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `Passwords need at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  return null;
}

export function checkDisplayName(value: string): string | null {
  const name = value.trim();
  if (name === "") return "What should we call you on your comics?";
  if (name.length > DISPLAY_NAME_MAX_LENGTH) {
    return `Keep it under ${DISPLAY_NAME_MAX_LENGTH} characters so it fits on a panel.`;
  }
  return null;
}

/** All problems with the form, keyed by field. Empty when it can be sent. */
export function validateLogin(fields: LoginFields, mode: LoginMode): LoginErrors {
  const errors: LoginErrors = {};

  const email = checkEmail(fields.email);
  if (email) errors.email = email;

  const password = checkPassword(fields.password);
  if (password) errors.password = password;

  if (mode === "signUp") {
    const displayName = checkDisplayName(fields.displayName);
    if (displayName) errors.displayName = displayName;
  }

  return errors;
}

/** The fields each mode shows, in on-screen order. */
export function fieldsFor(mode: LoginMode): LoginField[] {
  return mode === "signUp" ? ["displayName", "email", "password"] : ["email", "password"];
}

/** The first field with a problem, in on-screen order, so we can focus it. */
export function firstInvalidField(errors: LoginErrors, mode: LoginMode): LoginField | null {
  return fieldsFor(mode).find((field) => errors[field]) ?? null;
}
