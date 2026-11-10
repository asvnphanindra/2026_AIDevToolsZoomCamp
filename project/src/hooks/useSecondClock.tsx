import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const SecondClockContext = createContext(Date.now());

/**
 * One second-aligned timer for the signed-in shell.
 * Only consumers re-render each tick — not the whole planner tree.
 */
export function SecondClockProvider({ children }: { children: ReactNode }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let intervalId = 0;
    const tick = () => setNow(Date.now());
    const delay = 1000 - (Date.now() % 1000);
    const timeoutId = window.setTimeout(() => {
      tick();
      intervalId = window.setInterval(tick, 1000);
    }, delay);
    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId) window.clearInterval(intervalId);
    };
  }, []);

  return (
    <SecondClockContext.Provider value={now}>
      {children}
    </SecondClockContext.Provider>
  );
}

export function useSecondClock(): number {
  return useContext(SecondClockContext);
}
