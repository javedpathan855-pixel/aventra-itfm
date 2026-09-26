export const DURATIONS = {
  instant: 0.1,
  fast: 0.2,
  normal: 0.35,
  medium: 0.5,
  slow: 1.0,
  intro: 2.0,
} as const;

export type DurationKey = keyof typeof DURATIONS;
