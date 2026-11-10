"use client";

import { useEffect } from "react";

/* Registering the worker is what makes the app open with no connection. It
   runs after the first paint, so a phone on 3G renders the capture flow
   before it spends anything on installing it. */
export function ServiceWorker() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    const register = () => {
      void navigator.serviceWorker
        .register("/field-sw.js", { scope: "/field" })
        .catch(() => undefined);
    };
    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
