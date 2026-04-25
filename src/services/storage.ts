import type { Article, FavoriteItem } from "../types";

const ARTICLES_KEY = "satie-reader-articles";
const FAVORITES_KEY = "satie-reader-favorites";
const LEGACY_ARTICLES = "english-reader-articles";
const LEGACY_FAVORITES = "english-reader-favorites";

const SAMPLE_ARTICLES: Article[] = [
  {
    id: "sample-bbc-cdxd1v0028vo",
    title: "BBC News · cdxd1v0028vo",
    source: "url",
    isSample: true,
    createdAt: 1745539200000,
    content: `Sample article imported from BBC News.

Source: https://www.bbc.com/news/articles/cdxd1v0028vo

Open this sample to try reading, selection lookup, and context-aware favorites.`,
  },
  {
    id: "sample-bbc-cable-habits",
    title: "BBC Future · Your bad habits are destroying your charging cables",
    source: "url",
    isSample: true,
    createdAt: 1745625600000,
    content: `Sample article imported from BBC Future.

Source: https://www.bbc.com/future/article/20260421-your-bad-habits-are-destroying-your-charging-cables

Open this sample to try reading, selection lookup, and context-aware favorites.`,
  },
];

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
    if (!raw) {
      localStorage.setItem(ARTICLES_KEY, JSON.stringify(SAMPLE_ARTICLES));
      return SAMPLE_ARTICLES;
    }
    const parsed = JSON.parse(raw) as Article[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(ARTICLES_KEY, JSON.stringify(SAMPLE_ARTICLES));
      return SAMPLE_ARTICLES;
    }
    return parsed;
  } catch {
    return SAMPLE_ARTICLES;
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
