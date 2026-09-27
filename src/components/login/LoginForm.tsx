"use client";

import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { Segmented } from "@/components/Segmented";
import { auth } from "@/features/auth";
import {
  DISPLAY_NAME_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  firstInvalidField,
  validateLogin,
  type LoginField,
  type LoginFields,
  type LoginMode,
} from "@/features/login/validate";
import { ArrowRightIcon, SpinnerIcon } from "./icons";
import { TextField } from "./TextField";

const MODES = [
  { value: "signIn", label: "Sign in" },
  { value: "signUp", label: "Create account" },
] as const;

const EMPTY: LoginFields = { email: "", password: "", displayName: "" };

type Props = {
  /** Called just before the auth call, once the details have passed validation. */
  onSubmitStart?: () => void;
  /** Called after the auth call succeeds. */
  onSuccess: () => void;
};

/**
 * Sign in and create account on one card. Errors wait until you leave a field
 * or press the button, so nobody gets told off halfway through typing.
 */
export function LoginForm({ onSubmitStart, onSuccess }: Props) {
  const [mode, setMode] = useState<LoginMode>("signIn");
  const [fields, setFields] = useState<LoginFields>(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<LoginField, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const inputs = useRef<Partial<Record<LoginField, HTMLInputElement | null>>>({});

  const errors = validateLogin(fields, mode);
  const shown = (field: LoginField) => ((submitted || touched[field]) && errors[field]) || null;
  const creating = mode === "signUp";

  function change(field: LoginField, value: string) {
    setFields((current) => ({ ...current, [field]: value }));
    setProblem(null);
  }

  function blur(field: LoginField) {
    // Leaving an empty field you never typed in is not a mistake yet.
    if (fields[field] === "" && !submitted) return;
    setTouched((current) => ({ ...current, [field]: true }));
  }

  function switchMode(next: LoginMode) {
    setMode(next);
    setSubmitted(false);
    setTouched({});
    setProblem(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setSubmitted(true);

    const first = firstInvalidField(errors, mode);
    if (first) {
      inputs.current[first]?.focus();
      return;
    }

    setPending(true);
    setProblem(null);
    onSubmitStart?.();
    try {
      const email = fields.email.trim();
      if (creating) {
        const signedUp = await auth.signUp({
          email,
          password: fields.password,
          displayName: fields.displayName.trim(),
        });
        if (!signedUp) {
          setNotice("Check your email to confirm your account, then sign in here.");
          setMode("signIn");
          setPending(false);
          return;
        }
      } else {
        await auth.signIn({ email, password: fields.password });
      }
      onSuccess();
    } catch (error) {
      setProblem(
        error instanceof Error
          ? error.message
          : creating
            ? "We couldn't make your account just now. Give it another go?"
            : "That email and password didn't match. Try again?",
      );
      setPending(false);
    }
  }

  return (
    <div className="rounded-[28px] bg-white/90 p-4 shadow-card ring-1 ring-orange-100/70 backdrop-blur">
      <div className="flex justify-center">
        <Segmented
          label="Sign in or create an account"
          options={MODES}
          value={mode}
          onChange={switchMode}
        />
      </div>

      <form
        noValidate
        onSubmit={submit}
        aria-label={creating ? "Create account" : "Sign in"}
        aria-busy={pending}
        className="mt-4 flex flex-col gap-3.5"
      >
        {creating && (
          <TextField
            ref={(node) => {
              inputs.current.displayName = node;
            }}
            label="Your name"
            name="displayName"
            autoComplete="nickname"
            autoCapitalize="words"
            enterKeyHint="next"
            placeholder="What goes on your comics"
            maxLength={DISPLAY_NAME_MAX_LENGTH}
            value={fields.displayName}
            onChange={(event) => change("displayName", event.target.value)}
            onBlur={() => blur("displayName")}
            error={shown("displayName")}
            readOnly={pending}
          />
        )}

        <TextField
          ref={(node) => {
            inputs.current.email = node;
          }}
          label="Email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="next"
          placeholder="you@example.com"
          value={fields.email}
          onChange={(event) => change("email", event.target.value)}
          onBlur={() => blur("email")}
          error={shown("email")}
          readOnly={pending}
        />

        <TextField
          ref={(node) => {
            inputs.current.password = node;
          }}
          label="Password"
          name="password"
          revealable
          autoComplete={creating ? "new-password" : "current-password"}
          enterKeyHint="go"
          placeholder={creating ? `At least ${PASSWORD_MIN_LENGTH} characters` : "Your password"}
          value={fields.password}
          onChange={(event) => change("password", event.target.value)}
          onBlur={() => blur("password")}
          error={shown("password")}
          readOnly={pending}
        />

        {notice && (
          <p role="status" className="text-sm text-stone-700">
            {notice}
          </p>
        )}
        {problem && (
          <p role="alert" className="text-center text-sm font-bold text-red-600">
            {problem}
          </p>
        )}

        <Button type="submit" disabled={pending} className="mt-1 w-full">
          {pending ? (
            <>
              <SpinnerIcon className="size-5 animate-spin motion-reduce:animate-none" />
              {creating ? "Making your account…" : "Signing in…"}
            </>
          ) : (
            <>
              {creating ? "Create my account" : "Sign in"}
              <ArrowRightIcon className="size-5" />
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
