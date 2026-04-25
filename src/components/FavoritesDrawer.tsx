import { useMemo, useState } from "react";
import type { FavoriteItem } from "../types";
import { LookupBody } from "./LookupBody";

type SortKey = "time" | "alpha";

type Props = {
  open: boolean;
  onClose: () => void;
  items: FavoriteItem[];
  onOpenArticle: (articleId: string) => void;
  onRemove: (id: string) => void;
};

export function FavoritesDrawer({
  open,
  onClose,
  items,
  onOpenArticle,
  onRemove,
}: Props) {
  const [tab, setTab] = useState<"list" | "byArticle">("list");
  const [sort, setSort] = useState<SortKey>("time");
  const [detail, setDetail] = useState<FavoriteItem | null>(null);

  const sortedList = useMemo(() => {
    const arr = [...items];
    if (sort === "time") {
      arr.sort((a, b) => b.savedAt - a.savedAt);
    } else {
      arr.sort((a, b) =>
        a.text.localeCompare(b.text, "en", { sensitivity: "base", numeric: true })
      );
    }
    return arr;
  }, [items, sort]);

  const byArticle = useMemo(() => {
    const map = new Map<string, { title: string; items: FavoriteItem[] }>();
    for (const it of items) {
      const cur = map.get(it.articleId);
      if (cur) cur.items.push(it);
      else map.set(it.articleId, { title: it.articleTitle, items: [it] });
    }
    const groups = [...map.entries()].map(([articleId, v]) => ({
      articleId,
      articleTitle: v.title,
      items: v.items.sort((a, b) => b.savedAt - a.savedAt),
    }));
    groups.sort((a, b) => a.articleTitle.localeCompare(b.articleTitle, "zh-CN"));
    return groups;
  }, [items]);

  if (!open) return null;

  return (
    <div className="drawer-backdrop" onMouseDown={onClose}>
      <div className="drawer drawer-wide" onMouseDown={(e) => e.stopPropagation()}>
        <header className="drawer-head">
          <h2>收藏夹</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </header>

        <div className="fav-toolbar">
          <div className="tab-row">
            <button
              type="button"
              className={`tab-btn ${tab === "list" ? "on" : ""}`}
              onClick={() => setTab("list")}
            >
              列表
            </button>
            <button
              type="button"
              className={`tab-btn ${tab === "byArticle" ? "on" : ""}`}
              onClick={() => setTab("byArticle")}
            >
              按文章
            </button>
          </div>
          {tab === "list" && (
            <label className="sort-label">
              <span className="muted small">排序</span>
              <select
                className="sort-select"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
              >
                <option value="time">收藏时间</option>
                <option value="alpha">首字母（原文）</option>
              </select>
            </label>
          )}
        </div>

        {tab === "list" && (
          <ul className="fav-list fav-list-plain">
            {sortedList.length === 0 && <li className="muted empty">暂无收藏</li>}
            {sortedList.map((it) => (
              <li key={it.id}>
                <button
                  type="button"
                  className="fav-row"
                  onClick={() => setDetail(it)}
                >
                  <span className="badge small">{it.kind === "word" ? "词" : "句"}</span>
                  <span className="fav-row-text">{it.text}</span>
                  <time className="fav-row-time" dateTime={new Date(it.savedAt).toISOString()}>
                    {new Date(it.savedAt).toLocaleDateString()}
                  </time>
                </button>
              </li>
            ))}
          </ul>
        )}

        {tab === "byArticle" && (
          <div className="fav-by-article">
            {byArticle.length === 0 && <p className="muted empty">暂无收藏</p>}
            {byArticle.map((g) => (
              <section key={g.articleId} className="fav-article-group">
                <header className="fav-article-head">
                  <h3>{g.articleTitle}</h3>
                  <button
                    type="button"
                    className="btn micro secondary"
                    onClick={() => onOpenArticle(g.articleId)}
                  >
                    打开文章
                  </button>
                </header>
                <ul className="fav-nested-list">
                  {g.items.map((it) => (
                    <li key={it.id}>
                      <button type="button" className="fav-row nested" onClick={() => setDetail(it)}>
                        <span className="badge small">{it.kind === "word" ? "词" : "句"}</span>
                        <span className="fav-row-text">{it.text}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      {detail && (
        <div
          className="fav-detail-backdrop"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            if (e.target === e.currentTarget) setDetail(null);
          }}
        >
          <div className="fav-detail-panel" onMouseDown={(e) => e.stopPropagation()}>
            <header className="fav-detail-head">
              <h3>收藏详情</h3>
              <div className="fav-detail-actions">
                <button
                  type="button"
                  className="btn ghost danger"
                  onClick={() => {
                    onRemove(detail.id);
                    setDetail(null);
                  }}
                >
                  移除
                </button>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => onOpenArticle(detail.articleId)}
                >
                  打开原文
                </button>
                <button type="button" className="icon-btn" onClick={() => setDetail(null)} aria-label="关闭">
                  ×
                </button>
              </div>
            </header>
            <div className="fav-detail-body">
              <LookupBody
                mode={detail.kind === "word" ? "word" : "sentence"}
                text={detail.text}
                context={detail.context}
                articleTitle={detail.articleTitle}
                onFavorite={() => {}}
                showFavorite={false}
                initialTranslation={detail.translation}
                initialGrammar={detail.grammarNotes}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
