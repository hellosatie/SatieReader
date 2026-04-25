import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Article } from "../types";
import { translateToZh } from "../services/translate";

type Props = {
  article: Article;
  onBack: () => void;
  onOpenFavorites: () => void;
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
  onSaveArticle,
  onSelectSnippet,
}: Props) {
  const articleRef = useRef<HTMLElement>(null);
  const readerBodyRef = useRef<HTMLDivElement>(null);
  const editBodyRef = useRef<HTMLTextAreaElement>(null);
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(article.title);
  const [draftContent, setDraftContent] = useState(article.content);
  const [showResumeHint, setShowResumeHint] = useState(false);
  const [resumeRatio, setResumeRatio] = useState(0);
  const [paragraphPanel, setParagraphPanel] = useState<{
    index: number;
    text: string;
    translation: string;
    loading: boolean;
    err?: string;
  } | null>(null);

  const paragraphs = useMemo(() => {
    const parts = article.content.split(/\n\s*\n+/).map((p) => p.trim()).filter(Boolean);
    let cursor = 0;
    return parts.map((text, index) => {
      const found = article.content.indexOf(text, cursor);
      const start = found >= 0 ? found : cursor;
      cursor = start + text.length;
      return { text, index, start };
    });
  }, [article.content]);

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
      const sentenceStart = findSentenceStart(full, anchor);
      const sentenceEnd = findSentenceEnd(full, anchor + Math.max(1, len));
      let chunk = full.slice(sentenceStart, sentenceEnd).trim();
      const rel = Math.max(0, anchor - sentenceStart);
      if (rel >= 0 && rel + len <= chunk.length) {
        chunk =
          chunk.slice(0, rel) + "【" + chunk.slice(rel, rel + len) + "】" + chunk.slice(rel + len);
      }
      return chunk;
    },
    [article.content]
  );

  const offsetInArticle = useCallback((node: Node, offset: number): number | null => {
    const body = readerBodyRef.current;
    if (!body || !body.contains(node)) return null;
    const element = (node instanceof Element ? node : node.parentElement)?.closest(
      ".reader-paragraph"
    ) as HTMLElement | null;
    if (!element) return null;
    const start = Number(element.dataset.start ?? "0");
    const textEl = element.querySelector(".reader-paragraph-text");
    if (!textEl) return null;
    const range = document.createRange();
    try {
      range.setStart(textEl, 0);
      range.setEnd(node, offset);
    } catch {
      return null;
    }
    return start + range.toString().length;
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

  const openParagraphTranslation = async (index: number, text: string) => {
    setParagraphPanel({ index, text, translation: "", loading: true });
    try {
      const translation = await translateToZh(text);
      setParagraphPanel({ index, text, translation, loading: false });
    } catch {
      setParagraphPanel({
        index,
        text,
        translation: "",
        loading: false,
        err: "段落翻译暂不可用，请稍后再试。",
      });
    }
  };

  return (
    <div className="reader-layout reader-layout-wide">
      <header className="reader-toolbar">
        <button type="button" className="btn ghost" onClick={onBack}>
          <span className="btn-ico" aria-hidden>
            ⬅️
          </span>
          文库
        </button>
        <h1 className="reader-title">{article.title}</h1>
        <button type="button" className="btn secondary" onClick={onOpenFavorites}>
          <span className="btn-ico" aria-hidden>
            📒
          </span>
          单词本
        </button>
        {!editing ? (
          <button type="button" className="btn secondary" onClick={enterEditAtCurrentPosition}>
            <span className="btn-ico" aria-hidden>
              ✏️
            </span>
            编辑
          </button>
        ) : (
          <>
            <button type="button" className="btn primary" onClick={finishEdit}>
              <span className="btn-ico" aria-hidden>
                ✅
              </span>
              保存
            </button>
            <button type="button" className="btn ghost" onClick={cancelEdit}>
              <span className="btn-ico" aria-hidden>
                ✖️
              </span>
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
          <div ref={readerBodyRef} className="reader-body">
            {paragraphs.map((paragraph) => (
              <p
                key={`${paragraph.index}-${paragraph.text.slice(0, 24)}`}
                className="reader-paragraph"
                data-start={paragraph.start}
              >
                <span className="reader-paragraph-text">{paragraph.text}</span>
                <button
                  type="button"
                  className="para-flag-btn"
                  aria-label="翻译本段"
                  onClick={() => openParagraphTranslation(paragraph.index, paragraph.text)}
                >
                  🌐
                </button>
              </p>
            ))}
          </div>
        )}
      </article>
      {paragraphPanel && (
        <aside className="para-translate-drawer" role="dialog" aria-label="段落翻译">
          <header className="para-translate-head">
            <h3>段落翻译</h3>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setParagraphPanel(null)}
              aria-label="关闭段落翻译"
            >
              ✖️
            </button>
          </header>
          <div className="para-translate-body">
            <p className="muted small">第 {paragraphPanel.index + 1} 段</p>
            <blockquote className="sel-quote">{paragraphPanel.text}</blockquote>
            {paragraphPanel.loading && <p className="muted">翻译中…</p>}
            {!paragraphPanel.loading && paragraphPanel.err && (
              <p className="error-inline">{paragraphPanel.err}</p>
            )}
            {!paragraphPanel.loading && !paragraphPanel.err && (
              <p className="zh-line">{paragraphPanel.translation}</p>
            )}
          </div>
        </aside>
      )}
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
          🔽 回到上次阅读
        </button>
      )}
    </div>
  );
}

function findSentenceStart(text: string, from: number): number {
  for (let i = Math.max(0, from - 1); i >= 0; i--) {
    if (/[.!?]/.test(text[i])) {
      return i + 1;
    }
  }
  return 0;
}

function findSentenceEnd(text: string, from: number): number {
  for (let i = Math.max(0, from); i < text.length; i++) {
    if (/[.!?]/.test(text[i])) {
      return i + 1;
    }
  }
  return text.length;
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
