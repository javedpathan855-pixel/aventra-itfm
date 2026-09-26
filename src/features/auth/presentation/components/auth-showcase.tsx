"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { authShowcaseModeVariants } from "@/shared/animation";
import type { AuthMode } from "../hooks/use-auth";

interface AuthShowcaseProps {
  mode: AuthMode;
}

interface ShowcaseItem {
  src: string;
  alt: string;
  width: number;
  height: number;
  title: string;
  description: string;
}

const showcaseData: Record<AuthMode, ShowcaseItem> = {
  login: {
    src: "/icons/lock.png",
    alt: "Secure login",
    width: 190,
    height: 190,
    title: "Welcome Back",
    description:
      "Good to see you again. Sign in to continue where you left off.",
  },

  forgot: {
    src: "/icons/forgot.png",
    alt: "Password recovery",
    width: 120,
    height: 120,
    title: "Forgot Your Password?",
    description: "No worries. We'll help you get back into your account.",
  },

  register: {
    src: "/icons/register.png",
    alt: "Create account",
    width: 175,
    height: 175,
    title: "Create Your Account",
    description:
      "Set up your account and get started in just a few simple steps.",
  },

  otp: {
    src: "/icons/lock.png",
    alt: "Verification",
    width: 175,
    height: 175,
    title: "Almost There",
    description: "Enter the code we sent to your email to finish signing in.",
  },
};

const AuthShowcase = ({ mode }: AuthShowcaseProps) => {
  const current = showcaseData[mode] || showcaseData.login;

  return (
    <div className="relative flex w-full max-w-lg flex-col items-center justify-center px-4">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={mode}
          variants={authShowcaseModeVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="relative flex w-full flex-col items-center justify-center gap-1.5 sm:gap-2.5 lg:gap-5 text-center"
        >
          {/* Hero Illustration */}
          <div className="relative flex h-16 sm:h-20 md:h-24 lg:h-50 w-full items-center justify-center">
            <Image
              src={current.src}
              alt={current.alt}
              width={current.width}
              height={current.height}
              priority
              className="max-h-16 sm:max-h-20 md:max-h-24 lg:max-h-48 w-auto object-contain drop-shadow-[0_20px_35px_rgba(74,99,216,0.28)] transition-transform duration-500 hover:scale-105"
            />
          </div>

          {/* Heading & Description */}
          <div className="flex flex-col items-center justify-center gap-1 max-w-md">
            <h1 className="text-xl sm:text-2xl lg:text-4xl font-extrabold tracking-tight text-foreground">
              {current.title}
            </h1>
            <p className="text-xs sm:text-xs md:text-sm leading-relaxed text-muted line-clamp-2 sm:line-clamp-none">
              {current.description}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default AuthShowcase;
