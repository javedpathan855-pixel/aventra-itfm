"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  authShowcaseIntroVariants,
  authFormSectionIntroVariants,
} from "@/shared/animation";
import AuthShowcase from "../components/auth-showcase";
import LoginForm from "../forms/login-form";
import RegisterForm from "../forms/register-form";
import ForgotPasswordForm from "../forms/forgot-password-form";
import OtpVerificationForm from "../forms/otp-verification-form";
import useAuth from "../hooks/use-auth";
import { getSafeRedirectUrl } from "../../domain/services/auth-helpers";

/**
 * Single responsive auth tree (one AuthShowcase + one form instance).
 * Desktop (lg+): absolute stage for the center → left showcase
 * choreography — the showcase travels from viewport center to the left
 * half while the form fades in on the right. Mobile stacks vertically
 * (absolute/left animation state is inert on static elements).
 * Mode changes move programmatic focus to the form region for
 * screen-reader users.
 */
const AuthPageClient = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { mode, email, setForgot, setLogin, setRegister, setOtp } = useAuth();
  const formRegionRef = useRef<HTMLDivElement>(null);

  const rawRedirect =
    searchParams?.get("callbackUrl") ||
    searchParams?.get("redirect") ||
    searchParams?.get("returnTo");
  const safeRedirect = getSafeRedirectUrl(rawRedirect, "/dashboard");

  const handleOtpSuccess = () => {
    router.push(safeRedirect);
  };

  useEffect(() => {
    formRegionRef.current?.focus({ preventScroll: true });
  }, [mode]);

  return (
    <main className="relative h-screen w-full bg-background overflow-hidden">
      <div className="relative flex h-full w-full flex-col items-center justify-center gap-2.5 overflow-hidden px-4 py-3 sm:gap-4 sm:px-6 sm:py-4 lg:block lg:gap-0 lg:px-0 lg:py-0">
        <motion.section
          variants={authShowcaseIntroVariants}
          initial="initial"
          animate="animate"
          aria-label="Product showcase"
          className="flex w-full max-w-md shrink-0 items-center justify-center lg:absolute lg:top-1/2 lg:z-10 lg:w-1/2 lg:max-w-none lg:-translate-x-1/2 lg:-translate-y-1/2"
        >
          <AuthShowcase mode={mode} />
        </motion.section>

        <section
          aria-label="Authentication"
          className="flex w-full max-w-md shrink-0 items-center justify-center lg:absolute lg:top-1/2 lg:left-1/2 lg:w-1/2 lg:max-w-none lg:-translate-y-1/2 lg:px-6 xl:px-12"
        >
          <motion.div
            ref={formRegionRef}
            tabIndex={-1}
            aria-label="Authentication form"
            variants={authFormSectionIntroVariants}
            initial="initial"
            animate="animate"
            className="w-full max-w-md outline-none"
          >
            <AnimatePresence mode="wait">
              {mode === "login" && (
                <LoginForm
                  key="login"
                  onForgotPassword={setForgot}
                  onRegister={setRegister}
                  onUnverifiedEmail={(unverifiedEmail) => setOtp(unverifiedEmail)}
                />
              )}
              {mode === "register" && (
                <RegisterForm
                  key="register"
                  onLogin={setLogin}
                  onRegistered={(registeredEmail) => setOtp(registeredEmail)}
                />
              )}
              {mode === "forgot" && (
                <ForgotPasswordForm key="forgot" onLogin={setLogin} />
              )}
              {mode === "otp" && (
                <OtpVerificationForm
                  key="otp"
                  email={email}
                  onBackToLogin={setLogin}
                  onSuccess={handleOtpSuccess}
                />
              )}
            </AnimatePresence>
          </motion.div>
        </section>
      </div>
    </main>
  );
};

export default AuthPageClient;
