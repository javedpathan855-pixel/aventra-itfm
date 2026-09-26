"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import Divider from "@/shared/components/ui/divider";
import { Input } from "@/shared/components/ui/input";
import Checkbox from "@/shared/components/ui/checkbox";
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
  loginSchema,
  type LoginFormData,
} from "../../domain/schemas/auth.schema";
import {
  getSafeRedirectUrl,
  normalizeEmail,
} from "../../domain/services/auth-helpers";
import { mapProviderCodeToAppCode } from "../../domain/error/auth-error";
import { authClient } from "../auth-client";

interface LoginFormProps {
  onForgotPassword: () => void;
  onRegister?: () => void;
  onUnverifiedEmail?: (email: string) => void;
  onSubmit?: (data: LoginFormData) => void;
}

const GoogleIcon = () => (
  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

const LoginForm = ({
  onForgotPassword,
  onRegister,
  onUnverifiedEmail,
  onSubmit,
}: LoginFormProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: false,
    },
    mode: "onTouched",
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    setErrorMessage(null);
    onSubmit?.(data);

    try {
      const normalized = normalizeEmail(data.email);
      const result = await authClient.signIn.email({
        email: normalized,
        password: data.password,
        rememberMe: data.remember,
      });

      if (result.error) {
        // Branch on the mapped application code (domain taxonomy) — never
        // on raw provider strings scattered through components.
        const appCode = mapProviderCodeToAppCode(result.error.code ?? null);

        if (appCode === "EMAIL_NOT_VERIFIED") {
          // Trigger OTP delivery and route to verification
          try {
            await authClient.emailOtp.sendVerificationOtp({
              email: normalized,
              type: "email-verification",
            });
          } catch {
            // Error swallowed gracefully; OTP form handles resend
          }

          toast.warning("Verification Required", {
            description:
              "Please verify your email address before signing in. We've sent a 6-digit code.",
            duration: 6000,
          });

          onUnverifiedEmail?.(normalized);
          return;
        }

        if (appCode === "INVALID_CREDENTIALS") {
          const text = "The email or password you entered is incorrect.";
          setErrorMessage(text);
          toast.error("Sign In Failed", { description: text });
          return;
        }

        if (appCode === "RATE_LIMITED") {
          const text = "Too many sign-in attempts. Please wait a moment and try again.";
          setErrorMessage(text);
          toast.error("Rate Limited", { description: text });
          return;
        }

        const fallback = result.error.message || "Failed to sign in. Please verify your credentials.";
        setErrorMessage(fallback);
        toast.error("Authentication Error", { description: fallback });
        return;
      }

      toast.success("Welcome Back", {
        description: "Successfully authenticated. Loading workspace...",
        duration: 2500,
      });

      const rawRedirect =
        searchParams?.get("callbackUrl") ||
        searchParams?.get("redirect") ||
        searchParams?.get("returnTo");
      const safeRedirect = getSafeRedirectUrl(rawRedirect, "/dashboard");

      router.push(safeRedirect);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "An unexpected authentication error occurred.";
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
      className="flex w-full h-full flex-col justify-center items-center gap-2 sm:gap-3"
    >
      <Card className="max-w-md w-full flex flex-col gap-3 sm:gap-4 lg:gap-5 items-center justify-center p-4 sm:p-5 lg:p-7">
        <div className="flex flex-col gap-0.5 sm:gap-1 w-full text-left">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold tracking-tight text-foreground">
            Sign In
          </h2>
          <p className="text-[11px] sm:text-xs text-muted">
            Enter your credentials to access your ITFM dashboard
          </p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="w-full rounded-lg bg-error-muted border border-error/30 p-2.5 text-xs text-error leading-relaxed flex items-start gap-2"
          >
            <span className="shrink-0 mt-0.5">&bull;</span>
            <span>{errorMessage}</span>
          </div>
        )}

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
                    Email Address
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

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs sm:text-sm">Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Enter your password"
                      autoComplete="current-password"
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

            <div className="w-full flex items-center justify-between pt-0.5">
              <FormField
                control={form.control}
                name="remember"
                render={({ field }) => (
                  <FormItem className="w-auto flex-row items-center gap-0">
                    <FormControl>
                      <Checkbox
                        size="sm"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={form.formState.isSubmitting}
                      >
                        <span className="text-[11px] sm:text-xs font-normal text-muted">
                          Remember this device
                        </span>
                      </Checkbox>
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button
                type="button"
                onClick={onForgotPassword}
                variant="link"
                className="text-[11px] sm:text-xs"
              >
                Forgot password?
              </Button>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-1 sm:mt-1.5"
              isLoading={form.formState.isSubmitting}
              disabled={form.formState.isSubmitting}
            >
              Sign In
            </Button>
          </form>
        </Form>

        <Divider className="my-1">Or continue with</Divider>

        <Button
          type="button"
          variant="default"
          className="w-full gap-2.5 hover:bg-surface-elevated text-xs sm:text-sm"
          onClick={() => {
            toast.info("Single Sign-On", {
              description: "Google SSO integration is managed by your workspace administrator.",
            });
          }}
        >
          <GoogleIcon />
          <span>Continue with Google</span>
        </Button>
      </Card>

      <div className="flex items-center justify-center gap-1.5 text-[11px] sm:text-xs text-muted">
        <span>Need an account?</span>
        <Button
          type="button"
          onClick={onRegister}
          variant="link"
          className="text-[11px] sm:text-xs p-0 h-auto font-medium"
        >
          Register workspace
        </Button>
      </div>
    </motion.div>
  );
};

export default LoginForm;
