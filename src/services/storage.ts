import type { Article, FavoriteItem } from "../types";

const ARTICLES_KEY = "satie-reader-articles";
const FAVORITES_KEY = "satie-reader-favorites";
const LEGACY_ARTICLES = "english-reader-articles";
const LEGACY_FAVORITES = "english-reader-favorites";

function migrateLegacy(): void {
  try {
    if (!localStorage.getItem(ARTICLES_KEY)) {
      const old = localStorage.getItem(LEGACY_ARTICLES);
      if (old) {
        localStorage.setItem(ARTICLES_KEY, old);
        localStorage.removeItem(LEGACY_ARTICLES);
      }
    }
    if (!localStorage.getItem(FAVORITES_KEY)) {
      const oldF = localStorage.getItem(LEGACY_FAVORITES);
      if (oldF) {
        localStorage.setItem(FAVORITES_KEY, oldF);
        localStorage.removeItem(LEGACY_FAVORITES);
      }
    }
  } catch {
    /* ignore */
  }
}

export function loadArticles(): Article[] {
  migrateLegacy();
  try {
    const raw = localStorage.getItem(ARTICLES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Article[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveArticles(articles: Article[]): void {
  localStorage.setItem(ARTICLES_KEY, JSON.stringify(articles));
}

export function loadFavorites(): FavoriteItem[] {
  migrateLegacy();
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FavoriteItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveFavorites(items: FavoriteItem[]): void {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(items));
}
