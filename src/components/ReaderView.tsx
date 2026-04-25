import { useCallback, useEffect, useRef, useState } from "react";
import type { Article } from "../types";

type Props = {
  article: Article;
  onBack: () => void;
  onOpenFavorites: () => void;
  onImport: () => void;
  onSaveArticle: (id: string, patch: { title?: string; content?: string }) => void;
  onSelectSnippet: (payload: {
    mode: "word" | "sentence";
    text: string;
    context: string;
    anchorOffset: number;
    anchorRect: DOMRect;
  }) => void;
};

export function ReaderView({
  article,
  onBack,
  onOpenFavorites,
  onImport,
  onSaveArticle,
  onSelectSnippet,
}: Props) {
  const articleRef = useRef<HTMLElement>(null);
  const editBodyRef = useRef<HTMLTextAreaElement>(null);
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(article.title);
  const [draftContent, setDraftContent] = useState(article.content);
  const [showResumeHint, setShowResumeHint] = useState(false);
  const [resumeRatio, setResumeRatio] = useState(0);

  const storageKey = `satie-reader-progress:${article.id}`;

  useEffect(() => {
    if (editing) return;
    setDraftTitle(article.title);
    setDraftContent(article.content);
  }, [article.id, article.title, article.content, editing]);

  useEffect(() => {
    // Default always starts at top.
    window.scrollTo({ top: 0, behavior: "auto" });
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setShowResumeHint(false);
        setResumeRatio(0);
        return;
      }
      const parsed = Number(raw);
      if (!Number.isFinite(parsed) || parsed <= 0.03) {
        setShowResumeHint(false);
        setResumeRatio(0);
        return;
      }
      setResumeRatio(Math.max(0, Math.min(1, parsed)));
      setShowResumeHint(true);
    } catch {
      setShowResumeHint(false);
    }
  }, [storageKey]);

  useEffect(() => {
    if (editing) return;
    const onScroll = () => {
      const host = articleRef.current;
      const body = host?.querySelector(".reader-body") as HTMLElement | null;
      if (!host || !body) return;
      const rect = host.getBoundingClientRect();
      const docTop = window.scrollY + rect.top;
      const docBottom = docTop + host.offsetHeight;
      const viewportMid = window.scrollY + window.innerHeight * 0.42;
      const ratio = (viewportMid - docTop) / Math.max(1, docBottom - docTop);
      const clamped = Math.max(0, Math.min(1, ratio));
      localStorage.setItem(storageKey, clamped.toFixed(5));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [editing, storageKey]);

  const buildContext = useCallback(
    (anchor: number, len: number) => {
      const full = article.content;
      const before = 220;
      const after = 220;
      const start = Math.max(0, anchor - before);
      const end = Math.min(full.length, anchor + len + after);
      let chunk = full.slice(start, end);
      const rel = anchor - start;
      if (rel >= 0 && rel + len <= chunk.length) {
        chunk =
          chunk.slice(0, rel) + "【" + chunk.slice(rel, rel + len) + "】" + chunk.slice(rel + len);
      }
      return chunk.trim();
    },
    [article.content]
  );

  const offsetInArticle = useCallback((node: Node, offset: number): number | null => {
    const body = articleRef.current?.querySelector(".reader-body");
    if (!body?.firstChild) return null;
    const startNode = body.firstChild;
    const range = document.createRange();
    try {
      range.setStart(startNode, 0);
      range.setEnd(node, offset);
    } catch {
      return null;
    }
    return range.toString().length;
  }, []);

  const handleMouseUp = useCallback(() => {
    if (editing) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !articleRef.current) return;
    const raw = sel.toString().trim();
    if (!raw || raw.length < 2) return;

    let anchor = 0;
    let anchorRect = new DOMRect();
    try {
      const r = sel.getRangeAt(0);
      const off = offsetInArticle(r.startContainer, r.startOffset);
      if (off != null) anchor = off;
      anchorRect = r.getBoundingClientRect();
      if (anchorRect.width === 0 && anchorRect.height === 0) {
        const fallback = articleRef.current.getBoundingClientRect();
        anchorRect = new DOMRect(
          fallback.left + 24,
          fallback.top + 80,
          Math.min(120, fallback.width - 48),
          24
        );
      }
    } catch {
      anchor = article.content.indexOf(raw);
      if (anchor < 0) anchor = 0;
      anchorRect = articleRef.current.getBoundingClientRect();
    }

    const mode: "word" | "sentence" = inferSentence(raw) ? "sentence" : "word";
    const context = buildContext(anchor, raw.length);
    onSelectSnippet({ mode, text: raw, context, anchorOffset: anchor, anchorRect });
    sel.removeAllRanges();
  }, [article.content, buildContext, editing, offsetInArticle, onSelectSnippet]);

  const finishEdit = () => {
    onSaveArticle(article.id, {
      title: draftTitle.trim() || article.title,
      content: draftContent,
    });
    setEditing(false);
  };

  const cancelEdit = () => {
    setDraftTitle(article.title);
    setDraftContent(article.content);
    setEditing(false);
  };

  const scrollToRatio = (ratio: number, behavior: ScrollBehavior) => {
    const host = articleRef.current;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    const absTop = window.scrollY + rect.top;
    const target = absTop + host.offsetHeight * ratio - window.innerHeight * 0.32;
    window.scrollTo({ top: Math.max(0, target), behavior });
  };

  const enterEditAtCurrentPosition = () => {
    const host = articleRef.current;
    if (!host) {
      setEditing(true);
      return;
    }
    const rect = host.getBoundingClientRect();
    const absTop = window.scrollY + rect.top;
    const ratio = Math.max(
      0,
      Math.min(
        1,
        (window.scrollY + window.innerHeight * 0.42 - absTop) / Math.max(1, host.offsetHeight)
      )
    );
    const offset = Math.floor(article.content.length * ratio);
    setEditing(true);
    setTimeout(() => {
      const textarea = editBodyRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(offset, offset);
      const lineHeight = 24;
      const approxLine = draftContent.slice(0, offset).split("\n").length;
      textarea.scrollTop = Math.max(0, (approxLine - 3) * lineHeight);
    }, 0);
  };

  return (
    <div className="reader-layout reader-layout-wide">
      <header className="reader-toolbar">
        <button type="button" className="btn ghost" onClick={onBack}>
          ← 文库
        </button>
        <h1 className="reader-title">{article.title}</h1>
        <button type="button" className="btn ghost" onClick={onImport}>
          导入
        </button>
        <button type="button" className="btn secondary" onClick={onOpenFavorites}>
          收藏夹
        </button>
        {!editing ? (
          <button type="button" className="btn secondary" onClick={enterEditAtCurrentPosition}>
            编辑
          </button>
        ) : (
          <>
            <button type="button" className="btn primary" onClick={finishEdit}>
              保存
            </button>
            <button type="button" className="btn ghost" onClick={cancelEdit}>
              取消
            </button>
          </>
        )}
      </header>

      {article.deletedAt && (
        <p className="reader-trash-banner muted small">
          此文当前在回收站中，阅读不受影响；可在首页「回收站」恢复或彻底删除。
        </p>
      )}

      <article
        ref={articleRef}
        className="reader-article"
        onMouseUp={handleMouseUp}
        aria-label="正文，划选词句可查看释义"
      >
        {editing ? (
          <div className="reader-edit">
            <label className="edit-label">
              标题
              <input
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                className="edit-title-input"
              />
            </label>
            <label className="edit-label">
              正文
              <textarea
                ref={editBodyRef}
                className="edit-body"
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
                spellCheck={false}
              />
            </label>
          </div>
        ) : (
          <div className="reader-body">{article.content}</div>
        )}
      </article>
      {showResumeHint && !editing && (
        <button
          type="button"
          className="resume-fab"
          onClick={() => {
            scrollToRatio(resumeRatio, "smooth");
            setShowResumeHint(false);
          }}
          aria-label="跳转到上次阅读位置"
        >
          ↧ 回到上次阅读
        </button>
      )}
    </div>
  );
}

function inferSentence(text: string): boolean {
  const t = text.trim();
  const words = t.split(/\s+/).filter(Boolean).length;
  if (t.length > 100) return true;
  if (words >= 12) return true;
  if (/[.!?]["']?\s*$/.test(t) && t.length > 35) return true;
  if (t.includes("\n")) return true;
  return false;
}
