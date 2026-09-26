"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Lock, Mail, User } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
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
  registerSchema,
  type RegisterFormData,
} from "../../domain/schemas/auth.schema";
import { registerWorkspaceAction } from "@/app/(auth)/auth/register-action";

interface RegisterFormProps {
  onLogin: () => void;
  onRegistered: (email: string) => void;
}

const RegisterForm = ({ onLogin, onRegistered }: RegisterFormProps) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      organizationName: "",
      password: "",
      confirmPassword: "",
      termsAccepted: false,
    },
    mode: "onTouched",
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    setErrorMessage(null);

    try {
      // Server boundary: validation, normalization, user + organization +
      // owner membership, and error mapping all happen in the use case.
      // The form only transports validated input and renders safe results.
      const result = await registerWorkspaceAction(data);

      if (!result.ok) {
        const errorText =
          result.code === "CONFLICT"
            ? "An account with this email address already exists. Please sign in."
            : result.code === "RATE_LIMITED"
              ? "Too many registration attempts. Please wait a moment and try again."
              : "Could not complete registration. Please verify your details.";
        setErrorMessage(errorText);
        toast.error("Registration Failed", {
          description: errorText,
        });
        return;
      }

      toast.success("Workspace Created", {
        description:
          "We sent a 6-digit verification code to your email. Please verify to continue.",
        duration: 6000,
      });

      onRegistered(result.email);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMessage(msg);
      toast.error("Registration Error", {
        description: msg,
      });
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
            Create an Account
          </h2>
          <p className="text-[11px] sm:text-xs text-muted">
            Register your enterprise workspace for IT Financial Management
          </p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="w-full rounded-lg bg-error-muted border border-error/30 p-2.5 text-xs text-error leading-relaxed"
          >
            {errorMessage}
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
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs sm:text-sm">Full Name</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Jane Doe"
                      autoComplete="name"
                      startIcon={<User className="h-4 w-4" />}
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
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs sm:text-sm">Work Email</FormLabel>
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
              name="organizationName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs sm:text-sm">
                    Organization Name
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Acme Technologies"
                      autoComplete="organization"
                      startIcon={<Building2 className="h-4 w-4" />}
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
                      placeholder="Create a strong password (min 8 chars)"
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
                    Confirm Password
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Re-enter your password"
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
              name="termsAccepted"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormControl>
                    <Checkbox
                      size="sm"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={form.formState.isSubmitting}
                      error={fieldState.error ? true : undefined}
                    >
                      <span className="text-[11px] sm:text-xs font-normal text-muted">
                        I agree to the Terms of Service and Privacy Policy
                      </span>
                    </Checkbox>
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
              {form.formState.isSubmitting ? "Registering..." : "Register & Continue"}
            </Button>
          </form>
        </Form>
      </Card>

      <div className="flex items-center justify-center gap-1.5 text-[11px] sm:text-xs text-muted">
        <span>Already have an account?</span>
        <Button
          type="button"
          onClick={onLogin}
          variant="link"
          className="text-[11px] sm:text-xs p-0 h-auto"
        >
          Sign in
        </Button>
      </div>
    </motion.div>
  );
};

export default RegisterForm;
