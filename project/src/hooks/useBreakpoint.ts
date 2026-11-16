import { useEffect, useState } from "react";

export type Breakpoint = "phone" | "tablet" | "desktop";

const PHONE_MAX = 639;
const TABLET_MAX = 1023;

function readBreakpoint(width: number): Breakpoint {
  if (width <= PHONE_MAX) return "phone";
  if (width <= TABLET_MAX) return "tablet";
  return "desktop";
}

/** phone &lt;640 · tablet 640–1023 · desktop ≥1024 */
export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>(() =>
    typeof window === "undefined" ? "desktop" : readBreakpoint(window.innerWidth),
  );

  useEffect(() => {
    const onResize = () => setBp(readBreakpoint(window.innerWidth));
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return bp;
}

export function isPhoneBreakpoint(bp: Breakpoint): boolean {
  return bp === "phone";
}
