import type { Article } from "../types";

type Props = {
  open: boolean;
  onClose: () => void;
  trashed: Article[];
  onRestore: (id: string) => void;
  onPurge: (id: string) => void;
};

export function TrashDrawer({ open, onClose, trashed, onRestore, onPurge }: Props) {
  if (!open) return null;

  return (
    <div className="drawer-backdrop" onMouseDown={onClose}>
      <div className="drawer drawer-wide" onMouseDown={(e) => e.stopPropagation()}>
        <header className="drawer-head">
          <h2>回收站</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </header>
        <p className="muted small trash-hint">
          已删除的文章可恢复；彻底删除将同时移除仅关联该文的收藏条目。
        </p>
        <ul className="fav-list fav-list-plain">
          {trashed.length === 0 && <li className="muted empty">回收站为空</li>}
          {trashed.map((a) => (
            <li key={a.id} className="trash-row">
              <div className="trash-info">
                <span className="a-title">{a.title}</span>
                <span className="a-meta">
                  删除于 {a.deletedAt ? new Date(a.deletedAt).toLocaleString() : "—"}
                </span>
              </div>
              <div className="trash-actions">
                <button type="button" className="btn secondary" onClick={() => onRestore(a.id)}>
                  恢复
                </button>
                <button type="button" className="btn ghost danger" onClick={() => onPurge(a.id)}>
                  彻底删除
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
