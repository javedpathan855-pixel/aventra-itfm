export const EASINGS = {
  smooth: [0.22, 1, 0.36, 1],
  gentle: [0.25, 0.25, 0.25, 1],
  standard: [0.4, 0, 0.2, 1],
  bounce: [0.34, 1.56, 0.64, 1],
} as const;

export type EasingKey = keyof typeof EASINGS;
