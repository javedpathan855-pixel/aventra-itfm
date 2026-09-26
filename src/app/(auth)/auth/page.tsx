import { Suspense } from "react";
import AuthPageClient from "@/features/auth/presentation/pages/auth-page-client";

export const metadata = {
  title: "Authentication | Aventra ITFM",
  description: "Secure enterprise sign-in and registration for Aventra ITFM",
};

const AuthPage = () => {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center bg-background text-muted text-sm">
          Loading Aventra ITFM...
        </div>
      }
    >
      <AuthPageClient />
    </Suspense>
  );
};

export default AuthPage;
