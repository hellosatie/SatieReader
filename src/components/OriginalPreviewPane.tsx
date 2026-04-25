import type { RefObject } from "react";
import type { OriginalPreview } from "../types";

type Props = {
  original: OriginalPreview;
  /** 可滚动容器（纯文本、图片外框） */
  scrollRef: RefObject<HTMLDivElement>;
  iframeRef: RefObject<HTMLIFrameElement>;
};

function wrapDocHtml(html: string): string {
  const safe = html.replace(/<\/(script|iframe)/gi, "<\\/$1");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
    body{font-family:Georgia,'Times New Roman',serif;padding:18px 20px;line-height:1.65;color:#222;max-width:42rem;margin:0 auto;font-size:16px;}
    img{max-width:100%;height:auto;}
    p{margin:0.65em 0;}
  </style></head><body>${safe}</body></html>`;
}

export function OriginalPreviewPane({ original, scrollRef, iframeRef }: Props) {
  if (original.kind === "html") {
    return (
      <iframe
        ref={iframeRef}
        className="orig-iframe"
        title="原始 Word 排版"
        srcDoc={wrapDocHtml(original.html)}
      />
    );
  }
  if (original.kind === "pdf") {
    return (
      <iframe ref={iframeRef} className="orig-iframe" title="原始 PDF" src={original.url} />
    );
  }
  if (original.kind === "image") {
    return (
      <div ref={scrollRef} className="orig-scroll orig-scroll-image">
        <img src={original.url} alt="原始图片" className="orig-img" />
      </div>
    );
  }
  return (
    <div ref={scrollRef} className="orig-scroll orig-scroll-text">
      <pre className="orig-pre">{original.text}</pre>
    </div>
  );
}
