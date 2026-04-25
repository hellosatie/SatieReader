import { useEffect, useState } from "react";
import { fetchDictionary, type DictionaryResult } from "../services/dictionary";
import { translateToZh, explainGrammarWithDoubao } from "../services/translate";

export type LookupMode = "word" | "sentence";

export type LookupBodyProps = {
  mode: LookupMode;
  text: string;
  context: string;
  articleTitle: string;
  onFavorite: (payload: { translation?: string; grammarNotes?: string }) => void;
  compact?: boolean;
  initialTranslation?: string;
  initialGrammar?: string;
  /** 为 false 时隐藏底部「收藏到夹」（如在收藏详情中复用） */
  showFavorite?: boolean;
};

export function LookupBody({
  mode,
  text,
  context,
  articleTitle,
  onFavorite,
  compact,
  initialTranslation,
  initialGrammar,
  showFavorite = true,
}: LookupBodyProps) {
  const [translation, setTranslation] = useState<string>(initialTranslation ?? "");
  const [transLoading, setTransLoading] = useState(!initialTranslation);
  const [dict, setDict] = useState<DictionaryResult | null>(null);
  const [dictErr, setDictErr] = useState<string | null>(null);
  const [grammar, setGrammar] = useState(initialGrammar ?? "");
  const [grammarLoading, setGrammarLoading] = useState(false);
  const [grammarErr, setGrammarErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setTranslation(initialTranslation ?? "");
    setTransLoading(!initialTranslation);
    setDict(null);
    setDictErr(null);
    setGrammar(initialGrammar ?? "");
    setGrammarErr(null);

    translateToZh(text)
      .then((t) => {
        if (!cancelled) setTranslation(t);
      })
      .catch(() => {
        if (!cancelled) setTranslation("（翻译暂不可用，请稍后重试）");
      })
      .finally(() => {
        if (!cancelled) setTransLoading(false);
      });

    if (mode === "word") {
      const headWord = text.trim().split(/\s+/)[0]?.replace(/[^a-zA-Z'-]/g, "") ?? "";
      if (headWord.length >= 2 && headWord.length <= 48) {
        fetchDictionary(headWord)
          .then((d) => {
            if (!cancelled) setDict(d);
          })
          .catch(() => {
            if (!cancelled) setDictErr("词典数据加载失败");
          });
      }
    }

    return () => {
      cancelled = true;
    };
  }, [text, mode, initialTranslation, initialGrammar]);

  const runGrammar = async () => {
    setGrammarLoading(true);
    setGrammarErr(null);
    try {
      const g = await explainGrammarWithDoubao(text);
      setGrammar(g);
    } catch (e) {
      setGrammarErr(e instanceof Error ? e.message : "分析失败");
    } finally {
      setGrammarLoading(false);
    }
  };

  const secClass = compact ? "float-section compact-sec" : "float-section";

  return (
    <>
      <section className={secClass}>
        <h4>原文</h4>
        <blockquote className="sel-quote">{text}</blockquote>
        <p className="muted small">来自：{articleTitle}</p>
      </section>

      <section className={secClass}>
        <h4>翻译</h4>
        {transLoading ? <p className="muted">翻译中…</p> : <p className="zh-line">{translation}</p>}
      </section>

      {mode === "word" && (
        <section className={secClass}>
          <h4>词根</h4>
          {dictErr && <p className="muted">{dictErr}</p>}
          {!dict && !dictErr && <p className="muted">正在查询词根…</p>}
          {dict && dict.roots.length > 0 && (
            <ul className="root-list">
              {dict.roots.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          )}
          {dict && dict.roots.length === 0 && (
            <p className="muted small">暂未识别到清晰词根，可结合释义与例句记忆。</p>
          )}
        </section>
      )}

      {mode === "word" && (
        <section className={secClass}>
          <h4>释义和例句</h4>
          {/\s/.test(text.trim()) && (
            <p className="muted small">
              词组模式：词典释义针对首个英文词「{text.trim().split(/\s+/)[0]}」，整段翻译见上文。
            </p>
          )}
          {dictErr && <p className="muted">{dictErr}</p>}
          {!dict && !dictErr && <p className="muted">正在查询词典…</p>}
          {dict && (
            <div className="dict-body">
              {dict.phonetic && <p className="phonetic">/{dict.phonetic}/</p>}
              <ol className="sense-list">
                {dict.senses.map((s, i) => (
                  <li key={i}>
                    <span>{s.definition}</span>
                    {s.examples.map((ex, j) => (
                      <em key={j} className="example-line">
                        {ex}
                      </em>
                    ))}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>
      )}

      {mode === "sentence" && (
        <section className={secClass}>
          <h4>语法分析</h4>
          <button
            type="button"
            className="btn secondary"
            onClick={runGrammar}
            disabled={grammarLoading}
          >
            {grammarLoading ? "分析中…" : "生成语法讲解"}
          </button>
          {grammarErr && <p className="error-inline">{grammarErr}</p>}
          {grammar && <pre className="grammar-pre">{grammar}</pre>}
        </section>
      )}

      <section className={`${secClass} context-section`}>
        <h4>上下文</h4>
        <pre className="context-pre">{context}</pre>
      </section>

      {showFavorite && (
        <footer className={compact ? "float-foot compact-foot" : "float-foot"}>
          <button
            type="button"
            className="btn primary"
            onClick={() =>
              onFavorite({
                translation: translation || undefined,
                grammarNotes: grammar || undefined,
              })
            }
          >
            <span className="btn-ico" aria-hidden>
              ⭐
            </span>
            收藏到单词本
          </button>
        </footer>
      )}
    </>
  );
}
