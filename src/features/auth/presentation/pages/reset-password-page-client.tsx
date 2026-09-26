"use client";

import { useRouter } from "next/navigation";
import AuthShowcase from "../components/auth-showcase";
import ResetPasswordForm from "../forms/reset-password-form";

/**
 * Single responsive reset-password tree (one showcase + one form).
 * Mobile stacks vertically; desktop splits into two halves.
 */
const ResetPasswordPageClient = () => {
  const router = useRouter();

  return (
    <main className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-background p-4 sm:p-6">
      <div className="flex h-full max-h-screen w-full flex-col items-center justify-center gap-2.5 overflow-hidden px-4 py-3 sm:gap-4 sm:px-6 sm:py-4 lg:flex-row lg:gap-0 lg:px-0 lg:py-0">
        <section
          aria-label="Product showcase"
          className="flex w-full max-w-md shrink-0 items-center justify-center lg:w-1/2 lg:max-w-none"
        >
          <AuthShowcase mode="forgot" />
        </section>

        <section
          aria-label="Reset password form"
          className="flex w-full max-w-md shrink-0 items-center justify-center lg:w-1/2 lg:max-w-none lg:px-6 xl:px-12"
        >
          <div className="w-full max-w-md">
            <ResetPasswordForm
              onBackToLogin={() => router.push("/auth")}
              onSuccess={() => router.push("/auth")}
            />
          </div>
        </section>
      </div>
    </main>
  );
};

export default ResetPasswordPageClient;
