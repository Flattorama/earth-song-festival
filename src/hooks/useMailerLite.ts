import { useEffect } from "react";

declare global {
  interface Window {
    ml?: ((...args: unknown[]) => void) & { q?: unknown[][] };
  }
}

let scriptLoaded = false;

export function useMailerLite() {
  useEffect(() => {
    if (scriptLoaded) return;
    scriptLoaded = true;

    window.ml =
      window.ml ||
      function (...args: unknown[]) {
        (window.ml!.q = window.ml!.q || []).push(args);
      };

    window.ml("account", "2143726");

    const script = document.createElement("script");
    script.src = "https://assets.mailerlite.com/js/universal.js";
    script.async = true;
    document.head.appendChild(script);
  }, []);
}
