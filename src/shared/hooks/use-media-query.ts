"use client";

import { useSyncExternalStore } from "react";

/**
 * Clean, SSR-safe media query hook built on React 19's useSyncExternalStore.
 * Avoids layout shift and hydration mismatches.
 */
export const useMediaQuery = (query: string): boolean => {
  const subscribe = (callback: () => void) => {
    if (typeof window === "undefined") return () => {};
    const mediaQueryList = window.matchMedia(query);
    mediaQueryList.addEventListener("change", callback);
    return () => mediaQueryList.removeEventListener("change", callback);
  };

  const getSnapshot = () => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  };

  const getServerSnapshot = () => false;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
};

export default useMediaQuery;
