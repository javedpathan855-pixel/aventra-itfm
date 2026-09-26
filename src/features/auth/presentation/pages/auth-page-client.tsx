"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  authShowcaseIntroVariants,
  authFormSectionIntroVariants,
} from "@/shared/animation";
import AuthShowcase from "../components/auth-showcase";
import LoginForm from "../forms/login-form";
import useAuth from "../hooks/use-auth";
import ForgotPasswordForm from "../forms/forgot-password-form";

const AuthPageClient = () => {
  const { mode, setForgot, setLogin } = useAuth();

  return (
    <main className="relative h-screen  w-full bg-background overflow-hidden">
      {/* Desktop Presentation (>= 1024px) - Preserves exact initial 2s keyframe intro animation */}
      <div className="hidden lg:block h-full w-full">
        <motion.section
          variants={authShowcaseIntroVariants}
          initial="initial"
          animate="animate"
          className="absolute top-1/2 z-10 flex w-1/2 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
        >
          <AuthShowcase mode={mode} />
        </motion.section>

        <motion.section
          variants={authFormSectionIntroVariants}
          initial="initial"
          animate="animate"
          className="absolute top-1/2 flex w-1/2 -translate-y-1/2 items-center justify-center px-6 xl:px-12"
        >
          <AnimatePresence mode="wait">
            {mode === "login" && (
              <LoginForm key="login" onForgotPassword={setForgot} />
            )}
            {mode === "forgot" && (
              <ForgotPasswordForm key="forgot" onLogin={setLogin} />
            )}
          </AnimatePresence>
        </motion.section>
      </div>

      {/* Mobile & Tablet Presentation (< 1024px) - Perfectly fits in screen height with zero scroll */}
      <div className="flex lg:hidden h-full max-h-screen w-full flex-col items-center justify-center px-4 py-3 sm:px-6 sm:py-4 gap-2.5 sm:gap-4 overflow-hidden">
        <div className="w-full max-w-md flex flex-col items-center shrink-0">
          <AuthShowcase mode={mode} />
        </div>

        <div className="w-full max-w-md shrink-0">
          <AnimatePresence mode="wait">
            {mode === "login" && (
              <LoginForm key="login" onForgotPassword={setForgot} />
            )}
            {mode === "forgot" && (
              <ForgotPasswordForm key="forgot" onLogin={setLogin} />
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
};

export default AuthPageClient;
