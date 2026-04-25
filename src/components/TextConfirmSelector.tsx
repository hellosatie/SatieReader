import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { OriginalPreview, TextBlock } from "../types";
import { OriginalPreviewPane } from "./OriginalPreviewPane";

type Props = {
  blocks: TextBlock[];
  original: OriginalPreview;
  initialTitle: string;
  onConfirm: (title: string, mergedText: string) => void;
  /** 返回来源选择 */
  onCancel: () => void;
  /** 关闭整个导入流程 */
  onAbort: () => void;
};

function scrollRatio(el: HTMLElement): number {
  const max = el.scrollHeight - el.clientHeight;
  if (max <= 0) return 0;
  return el.scrollTop / max;
}

function setScrollRatio(el: HTMLElement, ratio: number) {
  const max = el.scrollHeight - el.clientHeight;
  el.scrollTop = ratio * Math.max(0, max);
}

export function TextConfirmSelector({
  blocks,
  original,
  initialTitle,
  onConfirm,
  onCancel,
  onAbort,
}: Props) {
  const [title, setTitle] = useState(initialTitle || "未命名文章");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(blocks.map((b) => b.id)));
  const [filter, setFilter] = useState("");
  const [orderReverse, setOrderReverse] = useState(false);
  const [manualEdit, setManualEdit] = useState(false);

  const leftScrollRef = useRef<HTMLDivElement>(null);
  const manualRef = useRef<HTMLTextAreaElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const syncing = useRef(false);

  const orderedBlocks = useMemo(() => {
    const arr = [...blocks];
    if (orderReverse) arr.reverse();
    return arr;
  }, [blocks, orderReverse]);

  const filteredBlocks = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return orderedBlocks;
    return orderedBlocks.filter((b) => b.text.toLowerCase().includes(q));
  }, [orderedBlocks, filter]);

  const mergedFromCheckboxes = useMemo(() => {
    const chosen = orderedBlocks.filter((b) => selectedIds.has(b.id));
    return chosen.map((b) => b.text).join("\n\n");
  }, [orderedBlocks, selectedIds]);

  const [editedBody, setEditedBody] = useState("");
  const displayBody = manualEdit ? editedBody : mergedFromCheckboxes;

  const syncEditFromMerged = useCallback(() => {
    setEditedBody(mergedFromCheckboxes);
  }, [mergedFromCheckboxes]);

  const getLeftEl = useCallback((): HTMLElement | null => {
    if (manualEdit) return manualRef.current;
    return leftScrollRef.current;
  }, [manualEdit]);

  const getRightDocEl = useCallback((): HTMLElement | null => {
    if (original.kind === "html" || original.kind === "pdf") {
      const doc = iframeRef.current?.contentDocument?.documentElement;
      return doc ?? null;
    }
    return rightScrollRef.current;
  }, [original.kind]);

  const applyRightRatio = useCallback(
    (ratio: number) => {
      const docEl = getRightDocEl();
      if (docEl) setScrollRatio(docEl, ratio);
    },
    [getRightDocEl]
  );

  const applyLeftRatio = useCallback(
    (ratio: number) => {
      const el = getLeftEl();
      if (el) setScrollRatio(el, ratio);
    },
    [getLeftEl]
  );

  const onLeftScroll = useCallback(() => {
    if (syncing.current) return;
    const left = getLeftEl();
    if (!left) return;
    syncing.current = true;
    applyRightRatio(scrollRatio(left));
    requestAnimationFrame(() => {
      syncing.current = false;
    });
  }, [applyRightRatio, getLeftEl]);

  const onRightScroll = useCallback(() => {
    if (syncing.current) return;
    const right = getRightDocEl();
    if (!right) return;
    syncing.current = true;
    applyLeftRatio(scrollRatio(right));
    requestAnimationFrame(() => {
      syncing.current = false;
    });
  }, [applyLeftRatio, getRightDocEl]);

  useEffect(() => {
    const left = getLeftEl();
    left?.addEventListener("scroll", onLeftScroll, { passive: true });
    return () => left?.removeEventListener("scroll", onLeftScroll);
  }, [getLeftEl, onLeftScroll, manualEdit, filteredBlocks.length]);

  useEffect(() => {
    const right = getRightDocEl();
    right?.addEventListener("scroll", onRightScroll, { passive: true });
    return () => right?.removeEventListener("scroll", onRightScroll);
  }, [getRightDocEl, onRightScroll, original]);

  useEffect(() => {
    if (original.kind !== "html" && original.kind !== "pdf") return;
    const iframe = iframeRef.current;
    if (!iframe) return;
    const attach = () => {
      const doc = iframe.contentDocument;
      const root = doc?.documentElement;
      root?.addEventListener("scroll", onRightScroll, { passive: true });
    };
    iframe.addEventListener("load", attach);
    return () => {
      iframe.removeEventListener("load", attach);
      const root = iframe.contentDocument?.documentElement;
      root?.removeEventListener("scroll", onRightScroll);
    };
  }, [original.kind, onRightScroll, original]);

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const b of filteredBlocks) next.add(b.id);
      return next;
    });
  };

  const deselectAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const b of filteredBlocks) next.delete(b.id);
      return next;
    });
  };

  const invertVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const b of filteredBlocks) {
        if (next.has(b.id)) next.delete(b.id);
        else next.add(b.id);
      }
      return next;
    });
  };

  const selectEveryNth = (n: number, offset: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      orderedBlocks.forEach((b, i) => {
        if (i % n === offset) next.add(b.id);
        else next.delete(b.id);
      });
      return next;
    });
  };

  const handleConfirm = () => {
    const body = manualEdit ? editedBody : mergedFromCheckboxes;
    onConfirm(title.trim() || "未命名文章", body.trim());
  };

  return (
    <div className="confirm-shell confirm-shell-wide">
      <header className="confirm-header">
        <div className="confirm-header-top">
          <h2>确认导入内容</h2>
          <button type="button" className="btn ghost" onClick={onAbort}>
            退出导入
          </button>
        </div>
        <p className="muted">
          左侧勾选或编辑抽取文本；右侧为原始文件预览。两侧滚动会按位置大致同步（PDF
          受浏览器内嵌阅读器限制，可能略有偏差）。
        </p>
        <label className="title-field">
          <span>文章标题</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="输入标题"
          />
        </label>
      </header>

      <div className="confirm-toolbar">
        <input
          className="filter-input"
          type="search"
          placeholder="筛选段落（关键字）…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <div className="btn-row">
          <button type="button" className="btn secondary" onClick={selectAllVisible}>
            全选可见
          </button>
          <button type="button" className="btn secondary" onClick={deselectAllVisible}>
            取消可见
          </button>
          <button type="button" className="btn secondary" onClick={invertVisible}>
            反选可见
          </button>
          <button type="button" className="btn secondary" onClick={() => selectEveryNth(2, 0)}>
            仅偶数段
          </button>
          <button type="button" className="btn secondary" onClick={() => selectEveryNth(2, 1)}>
            仅奇数段
          </button>
          <button
            type="button"
            className={`btn secondary ${orderReverse ? "active" : ""}`}
            onClick={() => setOrderReverse((v) => !v)}
          >
            段落顺序反转
          </button>
        </div>
        <div className="toggle-row">
          <label className="checkbox-inline">
            <input
              type="checkbox"
              checked={manualEdit}
              onChange={(e) => {
                const on = e.target.checked;
                if (on) syncEditFromMerged();
                setManualEdit(on);
              }}
            />
            全文编辑模式（直接改合并后的正文）
          </label>
        </div>
      </div>

      <div className="confirm-dual">
        <div className="confirm-col">
          <h3 className="confirm-col-title">抽取文本</h3>
          {!manualEdit && (
            <div
              ref={leftScrollRef}
              className="block-list block-list-tall"
              aria-label="段落选择"
            >
              {filteredBlocks.map((b) => (
                <label key={b.id} className={`block-card ${selectedIds.has(b.id) ? "on" : ""}`}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(b.id)}
                    onChange={() => toggle(b.id)}
                  />
                  <span className="block-meta">#{b.index + 1}</span>
                  <p className="block-text">{highlightFilter(b.text, filter)}</p>
                </label>
              ))}
              {filteredBlocks.length === 0 && (
                <p className="muted empty-hint">没有匹配的段落，请调整筛选条件。</p>
              )}
            </div>
          )}
          {manualEdit && (
            <textarea
              ref={manualRef}
              className="manual-textarea manual-textarea-tall"
              value={editedBody}
              onChange={(e) => setEditedBody(e.target.value)}
              spellCheck={false}
            />
          )}
        </div>
        <div className="confirm-col confirm-col-original">
          <h3 className="confirm-col-title">原始文件</h3>
          <div className="original-pane">
            <OriginalPreviewPane
              original={original}
              scrollRef={rightScrollRef}
              iframeRef={iframeRef}
            />
          </div>
        </div>
        <aside className="confirm-col confirm-col-preview">
          <h3 className="confirm-col-title">合并预览</h3>
          <p className="muted small">
            已选 {selectedIds.size} / {blocks.length} 段 · {manualEdit ? "编辑模式" : "勾选模式"}
          </p>
          <pre className="preview-pre preview-pre-tall">{displayBody.slice(0, 12000)}</pre>
          {displayBody.length > 12000 && (
            <p className="muted small">… 预览截断，完整内容以导入结果为准</p>
          )}
        </aside>
      </div>

      <footer className="confirm-footer">
        <button type="button" className="btn ghost" onClick={onCancel}>
          取消
        </button>
        <button
          type="button"
          className="btn primary"
          onClick={handleConfirm}
          disabled={!displayBody.trim()}
        >
          确认导入
        </button>
      </footer>
    </div>
  );
}

function highlightFilter(text: string, filter: string): ReactNode {
  const q = filter.trim();
  if (!q) return text;
  const lower = text.toLowerCase();
  const idx = lower.indexOf(q.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark>{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
}
