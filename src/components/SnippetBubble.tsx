import { useLayoutEffect, useState, type CSSProperties } from "react";
import { LookupBody } from "./LookupBody";
import type { LookupMode } from "./LookupBody";

type Props = {
  mode: LookupMode;
  text: string;
  context: string;
  articleTitle: string;
  anchorRect: DOMRect;
  onClose: () => void;
  onExpandSidebar: () => void;
  onFavorite: (payload: { translation?: string; grammarNotes?: string }) => void;
};

const BUBBLE_W = 360;
const MARGIN = 10;

export function SnippetBubble({
  mode,
  text,
  context,
  articleTitle,
  anchorRect,
  onClose,
  onExpandSidebar,
  onFavorite,
}: Props) {
  const [style, setStyle] = useState<CSSProperties>({});

  useLayoutEffect(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = anchorRect.left + anchorRect.width / 2 - BUBBLE_W / 2;
    left = Math.max(MARGIN, Math.min(left, vw - BUBBLE_W - MARGIN));

    const estH = Math.min(vh * 0.72, 520);
    let top = anchorRect.bottom + MARGIN;
    if (top + estH > vh - MARGIN) {
      top = anchorRect.top - estH - MARGIN;
    }
    if (top < MARGIN) top = MARGIN;

    setStyle({
      position: "fixed",
      left,
      top,
      width: BUBBLE_W,
      maxHeight: "min(72vh, 520px)",
      zIndex: 50,
    });
  }, [anchorRect]);

  return (
    <>
      <div className="bubble-dismiss" aria-hidden onMouseDown={onClose} />
      <div
        className="snippet-bubble"
        style={style}
        role="dialog"
        aria-label="词句释义"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="bubble-toolbar">
          <span className="badge">{mode === "word" ? "词句" : "句子"}</span>
          <div className="bubble-toolbar-actions">
            <button type="button" className="btn micro" onClick={onExpandSidebar}>
              <span className="btn-ico" aria-hidden>
                🧭
              </span>
              展开至侧栏
            </button>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="关闭">
              ✖️
            </button>
          </div>
        </header>
        <div className="bubble-scroll">
          <LookupBody
            mode={mode}
            text={text}
            context={context}
            articleTitle={articleTitle}
            onFavorite={onFavorite}
            compact
          />
        </div>
      </div>
    </>
  );
}
