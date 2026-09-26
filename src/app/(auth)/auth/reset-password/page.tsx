import { Suspense } from "react";
import ResetPasswordPageClient from "@/features/auth/presentation/pages/reset-password-page-client";

export const metadata = {
  title: "Reset Password | Aventra ITFM",
  description: "Set a new secure password for your Aventra ITFM account",
};

const ResetPasswordPage = () => {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center bg-background text-muted text-sm">
          Loading recovery portal...
        </div>
      }
    >
      <ResetPasswordPageClient />
    </Suspense>
  );
};

export default ResetPasswordPage;
