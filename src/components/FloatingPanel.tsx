import { LookupBody } from "./LookupBody";
import type { LookupMode } from "./LookupBody";
import { saveLookupDisplayMode } from "../services/lookupPrefs";

type Props = {
  mode: LookupMode;
  text: string;
  context: string;
  articleTitle: string;
  onClose: () => void;
  onFavorite: (payload: { translation?: string; grammarNotes?: string }) => void;
  onSwitchToBubble: () => void;
};

export function FloatingPanel({
  mode,
  text,
  context,
  articleTitle,
  onClose,
  onFavorite,
  onSwitchToBubble,
}: Props) {
  return (
    <div className="float-backdrop" onMouseDown={onClose}>
      <aside
        className="float-panel"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="词句详情"
      >
        <div className="float-head float-head-row">
          <span className="badge">{mode === "word" ? "词句" : "句子"}</span>
          <div className="float-head-actions">
            <button
              type="button"
              className="btn micro secondary"
              onClick={() => {
                saveLookupDisplayMode("bubble");
                onSwitchToBubble();
              }}
            >
              <span className="btn-ico" aria-hidden>
                💬
              </span>
              气泡模式
            </button>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="关闭">
              ✖️
            </button>
          </div>
        </div>
        <LookupBody
          mode={mode}
          text={text}
          context={context}
          articleTitle={articleTitle}
          onFavorite={onFavorite}
        />
      </aside>
    </div>
  );
}
