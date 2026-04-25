export type ArticleSource = "docx" | "pdf" | "image" | "url" | "paste";

export interface Article {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  source: ArticleSource;
  isSample?: boolean;
  /** 软删除时间戳；无此字段表示在架 */
  deletedAt?: number;
}

export type FavoriteKind = "word" | "sentence";

export interface FavoriteItem {
  id: string;
  kind: FavoriteKind;
  /** Selected text (word, phrase, or sentence) */
  text: string;
  /** Surrounding paragraph or excerpt for context */
  context: string;
  articleId: string;
  articleTitle: string;
  /** Offset in full article content where selection roughly starts */
  anchorOffset?: number;
  savedAt: number;
  /** Optional cached translation */
  translation?: string;
  /** Cached grammar notes for sentences */
  grammarNotes?: string;
}

export interface TextBlock {
  id: string;
  text: string;
  /** 0-based index in original split */
  index: number;
  /** Inclusive start index in full `raw` extraction string */
  charStart: number;
  /** Exclusive end index in full `raw` */
  charEnd: number;
}

/** 导入确认页右侧「原始文档」呈现 */
export type OriginalPreview =
  | { kind: "html"; html: string }
  | { kind: "pdf"; url: string }
  | { kind: "image"; url: string }
  | { kind: "text"; text: string };

export type LookupDisplayMode = "bubble" | "sidebar";
