import { useEffect, useState, } from "react";

const CITY_CACHE_KEY = "philo:current-city";
const CITY_CACHE_TTL_MS = 30 * 60 * 1000;
const CITY_LOOKUP_TIMEOUT_MS = 4000;
const CITY_LOOKUP_URL = "https://ipwho.is/";

function readCachedCity(): string {
  if (typeof window === "undefined") return "";

  try {
    const raw = localStorage.getItem(CITY_CACHE_KEY,);
    if (!raw) return "";
    const parsed = JSON.parse(raw,) as { city?: unknown; expiresAt?: unknown; };
    if (
      typeof parsed.city !== "string"
      || !parsed.city.trim()
      || typeof parsed.expiresAt !== "number"
      || parsed.expiresAt <= Date.now()
    ) {
      localStorage.removeItem(CITY_CACHE_KEY,);
      return "";
    }
    return parsed.city.trim();
  } catch {
    localStorage.removeItem(CITY_CACHE_KEY,);
    return "";
  }
}

function writeCachedCity(city: string,) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(
      CITY_CACHE_KEY,
      JSON.stringify({
        city,
        expiresAt: Date.now() + CITY_CACHE_TTL_MS,
      },),
    );
  } catch {}
}

function clearCachedCity() {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(CITY_CACHE_KEY,);
  } catch {}
}

async function fetchCurrentCity(signal: AbortSignal,): Promise<string> {
  const response = await fetch(CITY_LOOKUP_URL, {
    signal,
    headers: {
      Accept: "application/json",
    },
  },);
  if (!response.ok) return "";

  const payload = await response.json() as { success?: unknown; city?: unknown; };
  if (payload.success === false) return "";
  return typeof payload.city === "string" ? payload.city.trim() : "";
}

export function useCurrentCity(): string {
  const [city, setCity,] = useState(readCachedCity,);

  useEffect(() => {
    let disposed = false;

    async function refresh() {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), CITY_LOOKUP_TIMEOUT_MS,);

      try {
        const nextCity = await fetchCurrentCity(controller.signal,);
        if (disposed) return;

        if (nextCity) {
          writeCachedCity(nextCity,);
          setCity((prev,) => (prev !== nextCity ? nextCity : prev));
          return;
        }

        clearCachedCity();
        setCity("",);
      } catch (error) {
        if ((error as Error).name === "AbortError" || disposed) return;
        clearCachedCity();
        setCity("",);
      } finally {
        window.clearTimeout(timeoutId,);
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        refresh().catch(console.error,);
      }
    }

    refresh().catch(console.error,);
    document.addEventListener("visibilitychange", onVisibilityChange,);
    window.addEventListener("focus", refresh,);

    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVisibilityChange,);
      window.removeEventListener("focus", refresh,);
    };
  }, [],);

  return city;
}
