import { useEffect, useState } from "react";
import type { ArticleSource, OriginalPreview, TextBlock } from "../types";
import {
  convertDocxToHtml,
  extractFromDocx,
  extractFromPdf,
  extractFromImage,
  extractFromUrl,
  splitIntoBlocks,
} from "../services/extractText";
import { TextConfirmSelector } from "./TextConfirmSelector";

type Step = "source" | "loading" | "confirm";

type Pending = {
  title: string;
  raw: string;
  source: ArticleSource;
  blocks: TextBlock[];
  original: OriginalPreview;
  cleanup: () => void;
};

type Props = {
  onImported: (title: string, content: string, source: ArticleSource) => void;
  onClose: () => void;
};

const noop = () => {};

export function ImportWizard({ onImported, onClose }: Props) {
  const [step, setStep] = useState<Step>("source");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>("");
  const [pasteUrl, setPasteUrl] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);

  useEffect(() => {
    return () => {
      pending?.cleanup();
    };
  }, [pending]);

  const runExtract = async (
    source: ArticleSource,
    extractText: () => Promise<string>,
    titleHint: string,
    preview: (raw: string) => OriginalPreview | Promise<OriginalPreview>,
    cleanup: () => void = noop
  ) => {
    setError(null);
    setStep("loading");
    setProgress("正在提取文本…");
    try {
      const raw = await extractText();
      if (!raw.trim()) throw new Error("未识别到有效文本");
      const original = await preview(raw);
      const blocks = splitIntoBlocks(raw);
      setPending({
        title: titleHint,
        raw,
        source,
        blocks,
        original,
        cleanup,
      });
      setStep("confirm");
    } catch (e) {
      cleanup();
      setError(e instanceof Error ? e.message : "提取失败");
      setStep("source");
    } finally {
      setProgress("");
    }
  };

  if (step === "confirm" && pending) {
    return (
      <TextConfirmSelector
        blocks={pending.blocks}
        original={pending.original}
        initialTitle={pending.title}
        onAbort={() => {
          setPending(null);
          onClose();
        }}
        onCancel={() => {
          setPending(null);
          setStep("source");
        }}
        onConfirm={(title, merged) => {
          onImported(title, merged, pending.source);
          setPending(null);
          onClose();
        }}
      />
    );
  }

  return (
    <div className="wizard">
      <header className="wizard-header">
        <h2>导入文章</h2>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="关闭">
          ×
        </button>
      </header>

      {step === "loading" && (
        <div className="loading-panel">
          <div className="spinner" />
          <p>{progress}</p>
        </div>
      )}

      {step === "source" && (
        <div className="wizard-grid">
          <label className="drop-zone">
            <span className="dz-title">Word (.docx)</span>
            <input
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                await runExtract(
                  "docx",
                  () => extractFromDocx(f),
                  f.name.replace(/\.docx$/i, ""),
                  async () => {
                    const html = await convertDocxToHtml(f);
                    return { kind: "html", html };
                  }
                );
              }}
            />
          </label>
          <label className="drop-zone">
            <span className="dz-title">PDF</span>
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                const url = URL.createObjectURL(f);
                await runExtract(
                  "pdf",
                  () => extractFromPdf(f),
                  f.name.replace(/\.pdf$/i, ""),
                  () => ({ kind: "pdf", url }),
                  () => URL.revokeObjectURL(url)
                );
              }}
            />
          </label>
          <label className="drop-zone">
            <span className="dz-title">图片（OCR）</span>
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                const url = URL.createObjectURL(f);
                await runExtract(
                  "image",
                  () =>
                    extractFromImage(f, (p) => setProgress(`识别中 ${p}%`)),
                  f.name.replace(/\.\w+$/, ""),
                  () => ({ kind: "image", url }),
                  () => URL.revokeObjectURL(url)
                );
              }}
            />
          </label>

          <div className="card url-card">
            <h3>网页链接</h3>
            <p className="muted small">
              通过阅读器服务抓取正文（部分站点可能受限）。也可改用下方粘贴。
            </p>
            <div className="row-input">
              <input
                type="url"
                placeholder="https://..."
                value={pasteUrl}
                onChange={(e) => setPasteUrl(e.target.value)}
              />
              <button
                type="button"
                className="btn primary"
                onClick={() =>
                  runExtract("url", () => extractFromUrl(pasteUrl), hostnameTitle(pasteUrl), (raw) => ({
                    kind: "text",
                    text: raw,
                  }))
                }
              >
                抓取
              </button>
            </div>
          </div>

          <div className="card paste-card">
            <h3>直接粘贴</h3>
            <textarea
              rows={8}
              placeholder="粘贴任意英文正文…"
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
            />
            <button
              type="button"
              className="btn primary"
              disabled={!pasteText.trim()}
              onClick={() => {
                const body = pasteText;
                runExtract(
                  "paste",
                  async () => body,
                  "粘贴文章",
                  (raw) => ({ kind: "text", text: raw })
                );
              }}
            >
              下一步
            </button>
          </div>
        </div>
      )}

      {error && <p className="error-banner">{error}</p>}
    </div>
  );
}

function hostnameTitle(url: string): string {
  try {
    const u = new URL(url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "网页文章";
  }
}
