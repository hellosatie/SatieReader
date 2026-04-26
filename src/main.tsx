import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/global.css";

const BUILD_STAMP = __SATIE_BUILD_STAMP__;
const BUILD_STAMP_KEY = "satie-reader-build-stamp";
const ARTICLES_KEY = "satie-reader-articles";
const FAVORITES_KEY = "satie-reader-favorites";
const LEGACY_ARTICLES_KEY = "english-reader-articles";
const LEGACY_FAVORITES_KEY = "english-reader-favorites";

function shouldResetForBuildStamp(): boolean {
  try {
    const current = sessionStorage.getItem(BUILD_STAMP_KEY);
    if (current === BUILD_STAMP) return false;
    sessionStorage.setItem(BUILD_STAMP_KEY, BUILD_STAMP);
    return true;
  } catch {
    return false;
  }
}

function clearPersistedStateOnServerUpdate(): void {
  if (!shouldResetForBuildStamp()) return;
  try {
    localStorage.removeItem(ARTICLES_KEY);
    localStorage.removeItem(FAVORITES_KEY);
    localStorage.removeItem(LEGACY_ARTICLES_KEY);
    localStorage.removeItem(LEGACY_FAVORITES_KEY);
  } catch {
    /* ignore */
  }
}

clearPersistedStateOnServerUpdate();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
