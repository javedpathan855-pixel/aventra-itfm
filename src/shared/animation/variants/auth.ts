import type { Variants } from "framer-motion";
import { transitions } from "../transitions/presets";
import { DURATIONS } from "../tokens/durations";
import { EASINGS } from "../tokens/easings";

/**
 * Center-stage intro for the showcase column (desktop choreography):
 * appears at viewport center, holds while fading in, then travels to the
 * center of the left half. Final state is stable (left: "25%",
 * opacity: 1) — the showcase remains visible permanently.
 *
 * Requires an absolutely positioned half-width host with -translate-x-1/2
 * (see auth-page-client): left "50%" centers the panel, "25%" docks it to
 * the left half. Below lg the host is static, so `left` is inert there
 * and only the opacity phase applies.
 */
export const authShowcaseIntroVariants: Variants = {
  initial: {
    left: "50%",
    opacity: 0,
  },
  animate: {
    left: ["50%", "50%", "25%"],
    opacity: [0, 1, 1],
    transition: transitions.authIntroShowcase,
  },
};

/**
 * Delayed entrance for the right form column. Starts only after the
 * showcase settles left (delay derived from the showcase intro duration
 * in transitions.authIntroFormSection). Position is static (left: "50%",
 * right half); only opacity/x animate.
 */
export const authFormSectionIntroVariants: Variants = {
  initial: {
    left: "50%",
    opacity: 0,
    x: 32,
  },
  animate: {
    left: "50%",
    opacity: 1,
    x: 0,
    transition: transitions.authIntroFormSection,
  },
};

/**
 * Smooth transition variant for toggling auth showcase views (Login <-> Forgot Password <-> Register <-> OTP)
 */
export const authShowcaseModeVariants: Variants = {
  initial: {
    opacity: 0,
    x: -20,
    filter: "blur(3px)",
  },
  animate: {
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
    transition: {
      duration: DURATIONS.normal,
      ease: EASINGS.smooth,
    },
  },
  exit: {
    opacity: 0,
    x: 20,
    filter: "blur(3px)",
    transition: {
      duration: DURATIONS.fast,
      ease: EASINGS.gentle,
    },
  },
};

/**
 * Smooth transition variant for auth forms (LoginForm, RegisterForm, ForgotPasswordForm, OTPVerificationForm)
 */
export const authFormModeVariants: Variants = {
  initial: {
    opacity: 0,
    x: 20,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: DURATIONS.normal,
      ease: EASINGS.gentle,
    },
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: {
      duration: DURATIONS.fast,
      ease: EASINGS.gentle,
    },
  },
};
