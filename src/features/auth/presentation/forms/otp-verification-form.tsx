"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
import {
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { toast } from "@/shared/components/ui/toast";
import { authFormModeVariants } from "@/shared/animation";
import {
  OTP_LENGTH,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_SECONDS,
} from "../../domain/constants/auth-constants";
import { otpVerificationSchema } from "../../domain/schemas/auth.schema";
import { mapProviderCodeToAppCode } from "../../domain/error/auth-error";
import { authClient } from "../auth-client";

export type OtpVerificationState =
  | "idle"
  | "verifying"
  | "verified"
  | "invalid"
  | "expired"
  | "max_attempts"
  | "resending"
  | "resend_success"
  | "rate_limited"
  | "server_error";

interface OtpVerificationFormProps {
  email: string;
  onSuccess: () => void;
  onBackToLogin: () => void;
}

const OtpVerificationForm = ({
  email,
  onSuccess,
  onBackToLogin,
}: OtpVerificationFormProps) => {
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [status, setStatus] = useState<OtpVerificationState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [countdown, setCountdown] = useState(OTP_RESEND_COOLDOWN_SECONDS);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start/Manage Countdown timer with cleanup
  useEffect(() => {
    if (countdown <= 0) return;

    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownTimerRef.current)
            clearInterval(countdownTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, [countdown]);

  // Focus first input slot on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleVerify = useCallback(
    async (codeToVerify: string) => {
      if (status === "verifying") return;

      // Canonical domain validation (same schema the server use case
      // enforces) — replaces ad-hoc length checks.
      const parsed = otpVerificationSchema.safeParse({
        email,
        otp: codeToVerify,
      });
      if (!parsed.success) {
        setStatus("invalid");
        setErrorMessage(
          `Please enter the ${OTP_LENGTH}-digit numeric code sent to your email.`,
        );
        return;
      }

      if (failedAttempts >= OTP_MAX_ATTEMPTS) {
        setStatus("max_attempts");
        setErrorMessage(
          "Maximum verification attempts exceeded. Please request a new code.",
        );
        return;
      }

      setStatus("verifying");
      setErrorMessage(null);

      try {
        const result = await authClient.emailOtp.verifyEmail({
          email,
          otp: codeToVerify,
        });

        if (result.error) {
          const nextAttempts = failedAttempts + 1;
          setFailedAttempts(nextAttempts);

          // Branch on the mapped application code (domain taxonomy) — the
          // local attempt counter is UX display only; the server is the
          // abuse-protection boundary (TOO_MANY_ATTEMPTS → lockout below).
          const appCode = mapProviderCodeToAppCode(result.error.code ?? null);

          if (
            appCode === "VERIFICATION_ATTEMPTS_EXCEEDED" ||
            nextAttempts >= OTP_MAX_ATTEMPTS
          ) {
            setStatus("max_attempts");
            setErrorMessage(
              "Maximum verification attempts exceeded. Please request a new code.",
            );
            toast.error("Security Lockout", {
              description:
                "Too many incorrect attempts. Please request a new verification code.",
            });
            return;
          }

          if (appCode === "VERIFICATION_EXPIRED") {
            setStatus("expired");
            setErrorMessage(
              "This verification code has expired. Please request a new one.",
            );
            toast.error("Code Expired", {
              description:
                "The code expired after 10 minutes. Click resend for a new code.",
            });
          } else if (appCode === "RATE_LIMITED") {
            setStatus("rate_limited");
            setErrorMessage(
              "Too many attempts. Please wait a moment before trying again.",
            );
          } else {
            setStatus("invalid");
            setErrorMessage(
              `Incorrect verification code. ${OTP_MAX_ATTEMPTS - nextAttempts} attempts remaining.`,
            );
            toast.error("Verification Failed", {
              description: "The code entered is incorrect.",
            });
          }
          return;
        }

        setStatus("verified");
        toast.success("Email Verified", {
          description: "Your identity has been authenticated successfully.",
          duration: 3500,
        });

        setTimeout(() => {
          onSuccess();
        }, 600);
      } catch (err: unknown) {
        setStatus("server_error");
        const msg =
          err instanceof Error
            ? err.message
            : "An unexpected error occurred during verification.";
        setErrorMessage(msg);
        toast.error("Verification Error", { description: msg });
      }
    },
    [email, failedAttempts, onSuccess, status],
  );

  const handleDigitChange = (
    index: number,
    e: ChangeEvent<HTMLInputElement>,
  ) => {
    const val = e.target.value.replace(/\D/g, "");
    if (!val) {
      const next = [...digits];
      next[index] = "";
      setDigits(next);
      return;
    }

    const char = val[val.length - 1];
    const next = [...digits];
    next[index] = char;
    setDigits(next);

    // Auto-advance
    if (index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit if complete
    const fullCode = next.join("");
    if (fullCode.length === OTP_LENGTH) {
      handleVerify(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;

    const slice = pasted.slice(0, OTP_LENGTH).split("");
    const next = [...digits];
    slice.forEach((ch, idx) => {
      next[idx] = ch;
    });
    setDigits(next);

    const nextFocus = Math.min(slice.length, OTP_LENGTH - 1);
    inputRefs.current[nextFocus]?.focus();

    if (slice.length === OTP_LENGTH) {
      handleVerify(slice.join(""));
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || status === "resending") return;

    setStatus("resending");
    setErrorMessage(null);

    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "email-verification",
      });

      if (result.error) {
        const appCode = mapProviderCodeToAppCode(result.error.code ?? null);
        if (appCode === "RATE_LIMITED") {
          setStatus("rate_limited");
          setErrorMessage(
            "Too many resend attempts. Please wait a moment and try again.",
          );
          toast.error("Rate Limited", {
            description:
              "Please wait before requesting another verification code.",
          });
        } else {
          setStatus("server_error");
          setErrorMessage(
            result.error.message || "Failed to resend code. Please try again.",
          );
        }
        return;
      }

      setStatus("resend_success");
      setDigits(Array(OTP_LENGTH).fill(""));
      setFailedAttempts(0);
      setCountdown(OTP_RESEND_COOLDOWN_SECONDS);

      toast.success("Code Sent", {
        description: `A fresh 6-digit verification code was dispatched to ${email}.`,
      });

      inputRefs.current[0]?.focus();
    } catch (err: unknown) {
      setStatus("server_error");
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to dispatch verification code.";
      setErrorMessage(msg);
      toast.error("Resend Error", { description: msg });
    }
  };

  const fullCode = digits.join("");
  const isComplete = fullCode.length === OTP_LENGTH;
  const isLocked = failedAttempts >= OTP_MAX_ATTEMPTS;

  return (
    <motion.div
      variants={authFormModeVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex w-full h-full flex-col justify-center items-center gap-2 sm:gap-3"
    >
      <Card className="max-w-md w-full flex flex-col gap-3 sm:gap-4 lg:gap-5 items-center justify-center p-4 sm:p-5 lg:p-7">
        {/* Header Section */}
        <div className="flex flex-col gap-2 sm:gap-3 w-full text-left">
          <div className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-lg bg-primary-muted text-primary border border-primary/20">
            {status === "verified" ? (
              <CheckCircle2 className="h-5 w-5 text-success" />
            ) : status === "max_attempts" ? (
              <ShieldAlert className="h-5 w-5 text-error" />
            ) : (
              <ShieldCheck className="h-5 w-5" />
            )}
          </div>
          <div className="flex flex-col gap-0.5 sm:gap-1">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold tracking-tight text-foreground">
              Security Verification
            </h2>
            <p className="text-[11px] sm:text-xs text-muted leading-relaxed">
              We&apos;ve sent a 6-digit verification code to:
            </p>
            <p className="text-xs sm:text-sm font-semibold text-foreground bg-surface-elevated px-2.5 py-1 rounded border border-border inline-block max-w-full w-fit truncate">
              {email}
            </p>
          </div>
        </div>

        {/* Error / Alert Banner */}
        {errorMessage && (
          <div
            role="alert"
            className="w-full rounded-lg bg-error-muted border border-error/30 p-2.5 text-xs text-error leading-relaxed flex items-start gap-2"
          >
            <span className="shrink-0 mt-0.5">&bull;</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 6-Slot OTP Input Container */}
        <div
          role="group"
          aria-label="6-digit verification code"
          className="flex items-center justify-center gap-2 sm:gap-3 w-full my-1 sm:my-2"
        >
          {digits.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => {
                inputRefs.current[idx] = el;
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              disabled={status === "verifying" || isLocked}
              aria-label={`Digit ${idx + 1} of ${OTP_LENGTH}`}
              aria-invalid={
                status === "invalid" || status === "expired" || isLocked
              }
              onChange={(e) => handleDigitChange(idx, e)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              onPaste={handlePaste}
              className="h-11 w-10 sm:h-14 sm:w-12 text-center font-mono text-lg sm:text-2xl font-bold rounded-lg border border-border bg-surface-elevated text-foreground shadow-sm focus:border-primary focus:ring-2 focus:ring-ring/25 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed selection:bg-primary selection:text-white"
            />
          ))}
        </div>

        {/* Verify Action Button */}
        <Button
          type="button"
          variant="primary"
          className="w-full mt-1"
          onClick={() => handleVerify(fullCode)}
          disabled={!isComplete || status === "verifying" || isLocked}
          isLoading={status === "verifying"}
        >
          {status === "verifying" ? "Verifying Code..." : "Verify & Continue"}
        </Button>

        {/* Resend OTP Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 w-full pt-1 text-xs">
          <span className="text-[11px] sm:text-xs text-muted">
            Didn&apos;t receive the code?
          </span>

          {countdown > 0 ? (
            <span className="text-[11px] sm:text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <span>Resend available in</span>
              <span className="font-mono font-semibold text-foreground">
                {countdown}s
              </span>
            </span>
          ) : (
            <Button
              type="button"
              variant="link"
              onClick={handleResend}
              disabled={status === "resending"}
              isLoading={status === "resending"}
              className="text-xs gap-1.5 text-primary hover:text-primary-hover p-0 h-auto"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Resend Code</span>
            </Button>
          )}
        </div>
      </Card>

      {/* Navigation Return */}
      <div className="flex items-center justify-center">
        <Button
          type="button"
          onClick={onBackToLogin}
          variant="link"
          className="gap-2 text-[11px] sm:text-xs text-muted hover:text-foreground p-0 h-auto"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to sign in</span>
        </Button>
      </div>
    </motion.div>
  );
};

export default OtpVerificationForm;
