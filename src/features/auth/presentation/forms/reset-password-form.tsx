"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CheckCircle2, KeyRound, Lock, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { toast } from "@/shared/components/ui/toast";
import { authFormModeVariants } from "@/shared/animation";
import {
  resetPasswordSchema,
  type ResetPasswordFormData,
} from "../../domain/schemas/auth.schema";
import { resetPasswordAction } from "@/app/(auth)/auth/reset-action";

interface ResetPasswordFormProps {
  onBackToLogin: () => void;
  onSuccess?: () => void;
}

const ResetPasswordForm = ({
  onBackToLogin,
  onSuccess,
}: ResetPasswordFormProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Single token ownership: read once at the presentation boundary from the
  // reset URL. The token is passed to the server action as untrusted input
  // — never logged, toasted, or embedded in messages.
  const token = searchParams?.get("token") || "";
  const tokenError = searchParams?.get("error");

  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    tokenError
      ? "The password reset token is invalid or has expired. Please request a new one."
      : null,
  );
  const [linkInvalid, setLinkInvalid] = useState(false);

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
    mode: "onTouched",
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    if (!token) {
      const err = "No valid reset token found in URL. Please request a new link.";
      setErrorMessage(err);
      setLinkInvalid(true);
      toast.error("Invalid Token", { description: err });
      return;
    }

    setErrorMessage(null);
    setLinkInvalid(false);

    try {
      // Server boundary: token/password validation, provider invocation,
      // and error normalization all happen in the use case. The form only
      // transports validated input and renders safe application codes.
      const result = await resetPasswordAction({
        token,
        password: data.password,
        confirmPassword: data.confirmPassword,
      });

      if (!result.ok) {
        if (
          result.code === "VERIFICATION_FAILED" ||
          result.code === "VERIFICATION_EXPIRED"
        ) {
          const text = "This reset link has expired or has already been used. Please request a new one.";
          setErrorMessage(text);
          setLinkInvalid(true);
          toast.error("Link Expired", { description: text });
          return;
        }

        const text =
          result.code === "RATE_LIMITED"
            ? "Too many reset attempts. Please wait a moment and try again."
            : "Failed to reset password. Please try again.";
        setErrorMessage(text);
        toast.error("Reset Failed", { description: text });
        return;
      }

      setIsSuccess(true);
      toast.success("Password Updated", {
        description: "Your password has been changed successfully. Redirecting to sign in...",
        duration: 4000,
      });

      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        } else {
          router.push("/auth");
        }
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMessage(msg);
      toast.error("Error", { description: msg });
    }
  });

  return (
    <motion.div
      variants={authFormModeVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex w-full h-full flex-col items-center justify-center gap-2 sm:gap-3"
    >
      <Card className="max-w-md w-full flex flex-col gap-3 sm:gap-4 lg:gap-5 items-center justify-center p-4 sm:p-5 lg:p-7">
        {!isSuccess ? (
          <>
            <div className="flex flex-col gap-2 sm:gap-3 w-full text-left">
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 lg:h-11 lg:w-11 items-center justify-center rounded-lg bg-primary-muted text-primary border border-primary/20">
                <KeyRound className="h-4 w-4 sm:h-4.5 sm:w-4.5 lg:h-5 lg:w-5" />
              </div>
              <div className="flex flex-col gap-0.5 sm:gap-1">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold tracking-tight text-foreground">
                  Set New Password
                </h2>
                <p className="text-[11px] sm:text-xs text-muted leading-relaxed">
                  Create a new secure password for your Aventra ITFM account.
                </p>
              </div>
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="w-full rounded-lg bg-error-muted border border-error/30 p-2.5 text-xs text-error leading-relaxed flex items-start gap-2"
              >
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {linkInvalid && (
              <div className="flex flex-col gap-2 w-full">
                <Button
                  type="button"
                  variant="primary"
                  className="w-full text-xs"
                  onClick={() => router.push("/auth?mode=forgot")}
                >
                  Request a New Link
                </Button>
              </div>
            )}

            {!token && (
              <div className="flex flex-col gap-2 w-full">
                <p className="text-xs text-muted-foreground">
                  This password reset link is incomplete or no longer available. Request a new reset link to continue.
                </p>
                <Button
                  type="button"
                  variant="primary"
                  className="w-full text-xs"
                  onClick={() => router.push("/auth?mode=forgot")}
                >
                  Request a New Reset Link
                </Button>
                <Button
                  type="button"
                  variant="default"
                  className="w-full text-xs"
                  onClick={() => router.push("/auth")}
                >
                  Return to Sign In
                </Button>
              </div>
            )}

            {token && (
              <Form {...form}>
                <form
                  onSubmit={handleSubmit}
                  className="flex flex-col gap-2.5 sm:gap-3.5 lg:gap-4 w-full"
                  noValidate
                >
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs sm:text-sm">
                          New Password
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Enter new password (min 8 chars)"
                            autoComplete="new-password"
                            startIcon={<Lock className="h-4 w-4" />}
                            showPasswordToggle
                            disabled={form.formState.isSubmitting}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs sm:text-sm">
                          Confirm New Password
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Confirm your new password"
                            autoComplete="new-password"
                            startIcon={<Lock className="h-4 w-4" />}
                            showPasswordToggle
                            disabled={form.formState.isSubmitting}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full mt-1 sm:mt-1.5"
                    isLoading={form.formState.isSubmitting}
                    disabled={form.formState.isSubmitting}
                  >
                    Reset Password & Sign In
                  </Button>
                </form>
              </Form>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center text-center gap-3 w-full py-2">
            <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-success-muted text-success border border-success/20">
              <CheckCircle2 className="h-6 w-6" />
            </div>

            <div className="flex flex-col gap-1">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                Password Reset Complete
              </h2>
              <p className="text-[11px] sm:text-xs text-muted leading-relaxed max-w-xs">
                Your credentials have been updated securely. You can now access your account with your new password.
              </p>
            </div>

            <Button
              type="button"
              variant="primary"
              className="w-full mt-2"
              onClick={onBackToLogin}
            >
              Continue to Sign In
            </Button>
          </div>
        )}
      </Card>

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

export default ResetPasswordForm;
