import { useEffect, useState, } from "react";

function getCity(): string {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return tz.split("/",).pop()?.replace(/_/g, " ",) ?? "";
}

/**
 * Returns the city derived from the system timezone (e.g. "Seoul", "Lisbon"),
 * reactively updated when:
 * - The window regains focus (user switches back to app after traveling)
 * - The document becomes visible (computer wakes from sleep in a new timezone)
 */
export function useTimezoneCity(): string {
  const [city, setCity,] = useState(getCity,);

  useEffect(() => {
    function check() {
      setCity((prev,) => {
        const next = getCity();
        return prev !== next ? next : prev;
      },);
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") check();
    }

    document.addEventListener("visibilitychange", onVisibilityChange,);
    window.addEventListener("focus", check,);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange,);
      window.removeEventListener("focus", check,);
    };
  }, [],);

  return city;
}
