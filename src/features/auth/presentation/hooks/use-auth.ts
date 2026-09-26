"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export type AuthMode = "login" | "forgot" | "register" | "otp";

const AUTH_MODES: readonly AuthMode[] = ["login", "forgot", "register", "otp"];

const isAuthMode = (value: string | null): value is AuthMode =>
  value === "login" || value === "forgot" || value === "register" || value === "otp";

/**
 * Auth flow state. `mode` is URL state (?mode=) so login/register/forgot
 * links are deep-linkable and survive refresh; `email` stays local (never
 * in the URL — it is PII for the OTP step only).
 */
const useAuth = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialMode = isAuthMode(searchParams?.get("mode") ?? null)
    ? (searchParams?.get("mode") as AuthMode)
    : "login";

  const [mode, setModeState] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState<string>("");

  const setMode = useCallback(
    (next: AuthMode) => {
      setModeState(next);
      router.replace(`/auth?mode=${next}`, { scroll: false });
    },
    [router],
  );

  const setLogin = useCallback(() => setMode("login"), [setMode]);
  const setForgot = useCallback(() => setMode("forgot"), [setMode]);
  const setRegister = useCallback(() => setMode("register"), [setMode]);

  const setOtp = useCallback(
    (targetEmail: string) => {
      setEmail(targetEmail);
      setMode("otp");
    },
    [setMode],
  );

  return {
    mode,
    email,
    setLogin,
    setForgot,
    setRegister,
    setOtp,
  };
};

export { AUTH_MODES };
export default useAuth;
