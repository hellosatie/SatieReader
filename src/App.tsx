import { useCallback, useMemo, useState } from "react";
import type { Article, ArticleSource, FavoriteItem } from "./types";
import { loadArticles, loadFavorites, saveArticles, saveFavorites } from "./services/storage";
import { loadLookupDisplayMode, saveLookupDisplayMode } from "./services/lookupPrefs";
import type { LookupDisplayMode } from "./types";
import { ImportWizard } from "./components/ImportWizard";
import { ReaderView } from "./components/ReaderView";
import { FloatingPanel } from "./components/FloatingPanel";
import { SnippetBubble } from "./components/SnippetBubble";
import { FavoritesDrawer } from "./components/FavoritesDrawer";
import { TrashDrawer } from "./components/TrashDrawer";

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function App() {
  const [articles, setArticles] = useState<Article[]>(() => loadArticles());
  const [favorites, setFavorites] = useState<FavoriteItem[]>(() => loadFavorites());
  const [importOpen, setImportOpen] = useState(false);
  const [favOpen, setFavOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [readingId, setReadingId] = useState<string | null>(null);
  const [lookupUi, setLookupUi] = useState<LookupDisplayMode>(() => loadLookupDisplayMode());
  const [snippet, setSnippet] = useState<{
    mode: "word" | "sentence";
    text: string;
    context: string;
    anchorOffset: number;
    anchorRect: DOMRect;
  } | null>(null);

  const reading = useMemo(
    () => articles.find((a) => a.id === readingId) ?? null,
    [articles, readingId]
  );

  const activeArticles = useMemo(
    () => articles.filter((a) => !a.deletedAt).sort((a, b) => b.createdAt - a.createdAt),
    [articles]
  );

  const trashedArticles = useMemo(
    () => articles.filter((a) => a.deletedAt).sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0)),
    [articles]
  );

  const persistArticles = useCallback((next: Article[]) => {
    setArticles(next);
    saveArticles(next);
  }, []);

  const persistFavorites = useCallback((next: FavoriteItem[]) => {
    setFavorites(next);
    saveFavorites(next);
  }, []);

  const handleImported = (title: string, content: string, source: ArticleSource) => {
    const art: Article = {
      id: newId("art"),
      title,
      content,
      createdAt: Date.now(),
      source,
    };
    persistArticles([art, ...articles]);
    setReadingId(art.id);
  };

  const softDeleteArticle = (id: string) => {
    persistArticles(
      articles.map((a) => (a.id === id ? { ...a, deletedAt: Date.now() } : a))
    );
    if (readingId === id) setReadingId(null);
  };

  const restoreArticle = (id: string) => {
    persistArticles(
      articles.map((a) => (a.id === id ? { ...a, deletedAt: undefined } : a))
    );
  };

  const purgeArticle = (id: string) => {
    persistArticles(articles.filter((a) => a.id !== id));
    persistFavorites(favorites.filter((f) => f.articleId !== id));
    if (readingId === id) setReadingId(null);
  };

  const saveArticlePatch = (id: string, patch: { title?: string; content?: string }) => {
    persistArticles(
      articles.map((a) =>
        a.id === id
          ? {
              ...a,
              ...(patch.title != null ? { title: patch.title } : {}),
              ...(patch.content != null ? { content: patch.content } : {}),
            }
          : a
      )
    );
    if (patch.title != null) {
      persistFavorites(
        favorites.map((f) => (f.articleId === id ? { ...f, articleTitle: patch.title! } : f))
      );
    }
  };

  const addFavorite = (item: Omit<FavoriteItem, "id" | "savedAt">) => {
    const fav: FavoriteItem = {
      ...item,
      id: newId("fav"),
      savedAt: Date.now(),
    };
    persistFavorites([fav, ...favorites]);
    setSnippet(null);
  };

  const lookupShared = snippet && reading && (
    <>
      {lookupUi === "sidebar" && (
        <FloatingPanel
          mode={snippet.mode}
          text={snippet.text}
          context={snippet.context}
          articleTitle={reading.title}
          onClose={() => setSnippet(null)}
          onSwitchToBubble={() => setLookupUi("bubble")}
          onFavorite={(extra) =>
            addFavorite({
              kind: snippet.mode === "word" ? "word" : "sentence",
              text: snippet.text,
              context: snippet.context,
              articleId: reading.id,
              articleTitle: reading.title,
              anchorOffset: snippet.anchorOffset,
              translation: extra.translation,
              grammarNotes: extra.grammarNotes,
            })
          }
        />
      )}
      {lookupUi === "bubble" && (
        <SnippetBubble
          mode={snippet.mode}
          text={snippet.text}
          context={snippet.context}
          articleTitle={reading.title}
          anchorRect={snippet.anchorRect}
          onClose={() => setSnippet(null)}
          onExpandSidebar={() => {
            saveLookupDisplayMode("sidebar");
            setLookupUi("sidebar");
          }}
          onFavorite={(extra) =>
            addFavorite({
              kind: snippet.mode === "word" ? "word" : "sentence",
              text: snippet.text,
              context: snippet.context,
              articleId: reading.id,
              articleTitle: reading.title,
              anchorOffset: snippet.anchorOffset,
              translation: extra.translation,
              grammarNotes: extra.grammarNotes,
            })
          }
        />
      )}
    </>
  );

  return (
    <div className="app-root">
      {reading && (
        <>
          <ReaderView
            article={reading}
            onBack={() => setReadingId(null)}
            onOpenFavorites={() => setFavOpen(true)}
            onSaveArticle={saveArticlePatch}
            onSelectSnippet={(p) => setSnippet(p)}
          />
          {lookupShared}
        </>
      )}

      {!reading && (
        <div className="library library-wide">
          <header className="library-hero">
            <div className="brand-row">
              <img className="brand-icon" src="/satie-icon.svg" width={48} height={48} alt="" />
              <div>
                <h1>Satie Reader</h1>
                <p className="tagline">阅读进步，顺手的事</p>
              </div>
            </div>
            <nav className="home-nav" aria-label="主要入口">
              <button type="button" className="btn primary" onClick={() => setImportOpen(true)}>
                <span className="btn-ico" aria-hidden>
                  ⬆️
                </span>
                导入文章
              </button>
              <button type="button" className="btn secondary" onClick={() => setHelpOpen(true)}>
                <span className="btn-ico" aria-hidden>
                  💡
                </span>
                使用说明
              </button>
              <button type="button" className="btn secondary" onClick={() => setFavOpen(true)}>
                <span className="btn-ico" aria-hidden>
                  📒
                </span>
                单词本
                {favorites.length > 0 ? ` (${favorites.length})` : ""}
              </button>
              <button type="button" className="btn secondary" onClick={() => setTrashOpen(true)}>
                <span className="btn-ico" aria-hidden>
                  🗑️
                </span>
                回收站
                {trashedArticles.length > 0 ? ` (${trashedArticles.length})` : ""}
              </button>
            </nav>
          </header>

          <ul className="article-list">
            {activeArticles.length === 0 && (
              <li className="muted empty-lib">暂无文章，点击「导入文章」或试试下方示例。</li>
            )}
            {activeArticles.map((a) => (
              <li key={a.id} className="article-row">
                <button type="button" className="article-open" onClick={() => setReadingId(a.id)}>
                  <span className="a-title">{a.title}</span>
                  <span className="a-meta">
                    {new Date(a.createdAt).toLocaleDateString()} · {sourceLabel(a.source)}
                    {a.isSample ? " · 🧪 sample" : ""}
                  </span>
                </button>
                <button
                  type="button"
                  className="btn ghost danger"
                  onClick={() => softDeleteArticle(a.id)}
                >
                  删除
                </button>
              </li>
            ))}
          </ul>

          <section className="sample-section">
            <div className="section-head">
              <h2>📚 Sample 文章</h2>
              <p className="muted small">直接打开体验划选、收藏和上下文阅读。</p>
            </div>
            <ul className="sample-list">
              {activeArticles.filter((a) => a.isSample).map((a) => (
                <li key={a.id}>
                  <button type="button" className="sample-card" onClick={() => setReadingId(a.id)}>
                    <span className="sample-icon" aria-hidden>
                      📰
                    </span>
                    <span className="sample-copy">
                      <span className="a-title">{a.title}</span>
                      <span className="a-meta">{sourceLabel(a.source)} · 点击阅读</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {helpOpen && (
        <div className="modal-root help-modal" onMouseDown={() => setHelpOpen(false)}>
          <div className="help-card" onMouseDown={(e) => e.stopPropagation()}>
            <header className="wizard-header">
              <h2>💡 使用说明</h2>
              <button type="button" className="icon-btn" onClick={() => setHelpOpen(false)} aria-label="关闭">
                ✖️
              </button>
            </header>
            <ol className="help-list">
              <li>先点击“导入文章”，支持链接、粘贴、Word、PDF 和图片 OCR。</li>
              <li>进入阅读后，选中单词或句子即可查看释义与上下文。</li>
              <li>收藏会保留原文、上下文和可选翻译，方便回看。</li>
              <li>主页下方的 Sample 文章可直接打开，用来体验核心流程。</li>
            </ol>
          </div>
        </div>
      )}

      {importOpen && (
        <div className="modal-root">
          <ImportWizard
            onImported={handleImported}
            onClose={() => setImportOpen(false)}
          />
        </div>
      )}

      <FavoritesDrawer
        open={favOpen}
        onClose={() => setFavOpen(false)}
        items={favorites}
        onOpenArticle={(id) => {
          setReadingId(id);
          setFavOpen(false);
        }}
        onRemove={(id) => persistFavorites(favorites.filter((f) => f.id !== id))}
      />

      <TrashDrawer
        open={trashOpen}
        onClose={() => setTrashOpen(false)}
        trashed={trashedArticles}
        onRestore={restoreArticle}
        onPurge={purgeArticle}
      />
    </div>
  );
}

function sourceLabel(s: ArticleSource): string {
  const map: Record<ArticleSource, string> = {
    docx: "Word",
    pdf: "PDF",
    image: "图片",
    url: "链接",
    paste: "粘贴",
  };
  return map[s];
}
