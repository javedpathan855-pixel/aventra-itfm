"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CheckCircle2, KeyRound, Mail, RotateCw } from "lucide-react";
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
  forgotPasswordSchema,
  type ForgotPasswordFormData,
} from "../../domain/schemas/auth.schema";
import { normalizeEmail } from "../../domain/services/auth-helpers";
import { authClient } from "../auth-client";

interface ForgotPasswordFormProps {
  onLogin: () => void;
  onSubmit?: (data: ForgotPasswordFormData) => void;
}

const ForgotPasswordForm = ({ onLogin, onSubmit }: ForgotPasswordFormProps) => {
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [isResending, setIsResending] = useState(false);

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
    mode: "onTouched",
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    onSubmit?.(data);

    try {
      const normalized = normalizeEmail(data.email);
      setSubmittedEmail(normalized);

      // Better Auth requestPasswordReset API with security-hardened silent response
      await authClient.requestPasswordReset({
        email: normalized,
        redirectTo: "/auth/reset-password",
      });

      setIsSuccess(true);
      toast.success("Instructions Dispatched", {
        description:
          "If an account exists with this email, password reset instructions have been sent.",
        duration: 5000,
      });
    } catch {
      // Intentional defense in depth: always show generic confirmation to prevent user enumeration
      setIsSuccess(true);
      toast.success("Instructions Dispatched", {
        description:
          "If an account exists with this email, password reset instructions have been sent.",
      });
    }
  });

  const handleResend = async () => {
    if (!submittedEmail || isResending) return;
    setIsResending(true);

    try {
      await authClient.requestPasswordReset({
        email: submittedEmail,
        redirectTo: "/auth/reset-password",
      });

      toast.info("Reset Link Resent", {
        description: `Instructions were re-dispatched to ${submittedEmail}.`,
      });
    } catch {
      toast.info("Reset Link Resent", {
        description: `Instructions were re-dispatched to ${submittedEmail}.`,
      });
    } finally {
      setIsResending(false);
    }
  };

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
                  Reset Password
                </h2>
                <p className="text-[11px] sm:text-xs text-muted leading-relaxed">
                  Enter your registered work email and we will send you a secure verification link to reset your account credentials.
                </p>
              </div>
            </div>

            <Form {...form}>
              <form
                onSubmit={handleSubmit}
                className="flex flex-col gap-2.5 sm:gap-3.5 lg:gap-4 w-full"
                noValidate
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs sm:text-sm">
                        Registered Email
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="name@company.com"
                          autoComplete="email"
                          startIcon={<Mail className="h-4 w-4" />}
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
                  Send Reset Link
                </Button>
              </form>
            </Form>
          </>
        ) : (
          <div className="flex flex-col items-center text-center gap-3 w-full py-1">
            <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-success-muted text-success border border-success/20">
              <CheckCircle2 className="h-6 w-6" />
            </div>

            <div className="flex flex-col gap-1">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                Check Your Inbox
              </h2>
              <p className="text-[11px] sm:text-xs text-muted leading-relaxed max-w-xs">
                If an account exists, password reset instructions have been sent to:
              </p>
              <p className="text-xs sm:text-sm font-semibold text-foreground bg-surface-elevated px-3 py-1 rounded border border-border mt-0.5 truncate max-w-xs">
                {submittedEmail}
              </p>
            </div>

            <p className="text-[10px] sm:text-[11px] text-muted-foreground max-w-xs">
              Didn&apos;t receive the link? Please verify your spam folder or request a new link.
            </p>

            <div className="flex flex-col gap-2 w-full mt-1">
              <Button
                type="button"
                variant="default"
                className="w-full gap-2 text-xs"
                onClick={handleResend}
                disabled={isResending}
                isLoading={isResending}
              >
                <RotateCw className="h-3.5 w-3.5" />
                <span>Resend email link</span>
              </Button>

              <Button
                type="button"
                variant="primary"
                className="w-full"
                onClick={onLogin}
              >
                Return to Sign In
              </Button>
            </div>
          </div>
        )}
      </Card>

      {!isSuccess && (
        <div className="flex items-center justify-center">
          <Button
            type="button"
            onClick={onLogin}
            variant="link"
            className="gap-2 text-[11px] sm:text-xs text-muted hover:text-foreground p-0 h-auto"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to sign in</span>
          </Button>
        </div>
      )}
    </motion.div>
  );
};

export default ForgotPasswordForm;
