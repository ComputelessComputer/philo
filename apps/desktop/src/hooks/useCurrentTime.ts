import { useEffect, useState, } from "react";

export function useCurrentTime(intervalMs = 1000,): Date {
  const [now, setNow,] = useState(() => new Date());

  useEffect(() => {
    const sync = () => {
      setNow(new Date(),);
    };

    const intervalId = window.setInterval(sync, intervalMs,);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        sync();
      }
    };

    window.addEventListener("focus", sync,);
    document.addEventListener("visibilitychange", handleVisibilityChange,);

    return () => {
      window.clearInterval(intervalId,);
      window.removeEventListener("focus", sync,);
      document.removeEventListener("visibilitychange", handleVisibilityChange,);
    };
  }, [intervalMs,],);

  return now;
}
