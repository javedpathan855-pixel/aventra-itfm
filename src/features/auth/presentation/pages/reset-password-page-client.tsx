"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  authShowcaseIntroVariants,
  authFormSectionIntroVariants,
} from "@/shared/animation";
import AuthShowcase from "../components/auth-showcase";
import ResetPasswordForm from "../forms/reset-password-form";

/**
 * Single responsive reset-password tree (one showcase + one form).
 * Desktop (lg+): same absolute stage as the main auth page — the showcase
 * travels CENTER → LEFT while the form fades in on the right. Mobile
 * stacks vertically (absolute/left animation state is inert on static
 * elements). Focus moves into the form region on mount for
 * screen-reader users.
 */
const ResetPasswordPageClient = () => {
  const router = useRouter();
  const formRegionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    formRegionRef.current?.focus({ preventScroll: true });
  }, []);

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
          <AuthShowcase mode="reset" />
        </motion.section>

        <section
          aria-label="Reset password"
          className="flex w-full max-w-md shrink-0 items-center justify-center lg:absolute lg:top-1/2 lg:left-1/2 lg:w-1/2 lg:max-w-none lg:-translate-y-1/2 lg:px-6 xl:px-12"
        >
          <motion.div
            ref={formRegionRef}
            tabIndex={-1}
            aria-label="Reset password form"
            variants={authFormSectionIntroVariants}
            initial="initial"
            animate="animate"
            className="w-full max-w-md outline-none"
          >
            <ResetPasswordForm
              onBackToLogin={() => router.push("/auth")}
              onSuccess={() => router.push("/auth")}
            />
          </motion.div>
        </section>
      </div>
    </main>
  );
};

export default ResetPasswordPageClient;
