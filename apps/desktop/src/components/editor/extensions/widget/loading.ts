export function waitForNextPaint(): Promise<void> {
  if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
    return Promise.resolve();
  }

  return new Promise((resolve,) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    },);
  },);
}
