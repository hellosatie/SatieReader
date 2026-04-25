import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";
import Tesseract from "tesseract.js";
import type { TextBlock } from "../types";

// Vite-friendly worker URL for pdf.js
import pdfWorker from "pdfjs-dist/build/pdf.worker.mjs?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export async function extractFromDocx(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buf });
  return normalizeText(result.value);
}

/** 用于导入预览：与纯文本同源排版 */
export async function convertDocxToHtml(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer: buf });
  return result.value;
}

export async function extractFromPdf(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: buf }).promise;
  const parts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .filter(Boolean);
    parts.push(strings.join(" "));
  }
  return normalizeText(parts.join("\n\n"));
}

export async function extractFromImage(
  file: File,
  onProgress?: (p: number) => void
): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const {
      data: { text },
    } = await Tesseract.recognize(url, "eng", {
      logger: (m) => {
        if (m.status === "recognizing text" && typeof m.progress === "number") {
          onProgress?.(Math.round(m.progress * 100));
        }
      },
    });
    return normalizeText(text);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Fetch readable text from URL via r.jina.ai reader (markdown/plain). */
export async function extractFromUrl(url: string): Promise<string> {
  const trimmed = url.trim();
  if (!trimmed) throw new Error("请输入链接");
  let u: URL;
  try {
    u = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  } catch {
    throw new Error("链接格式无效");
  }
  const readerUrl = `https://r.jina.ai/${u.toString()}`;
  const res = await fetch(readerUrl, { headers: { Accept: "text/plain" } });
  if (!res.ok) throw new Error(`无法抓取页面 (${res.status})`);
  const body = await res.text();
  return normalizeText(stripMarkdownNoise(body));
}

function stripMarkdownNoise(md: string): string {
  return md
    .replace(/^#+\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1");
}

function normalizeText(s: string): string {
  return s
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function splitIntoBlocks(text: string, maxBlocks = 500): TextBlock[] {
  const blocks: TextBlock[] = [];
  const re = /\n\s*\n+/g;
  let segStart = 0;
  let m: RegExpExecArray | null;
  let index = 0;

  const pushBlock = (start: number, end: number) => {
    const slice = text.slice(start, end);
    const trimmed = slice.trim();
    if (!trimmed) return;
    const lead = slice.indexOf(trimmed);
    const charStart = start + Math.max(0, lead);
    const charEnd = charStart + trimmed.length;
    blocks.push({
      id: `b-${index}-${hashShort(trimmed)}`,
      text: trimmed,
      index,
      charStart,
      charEnd,
    });
    index++;
  };

  while ((m = re.exec(text)) !== null) {
    pushBlock(segStart, m.index);
    segStart = m.index + m[0].length;
  }
  pushBlock(segStart, text.length);

  if (blocks.length === 0 && text.trim()) {
    const lines = text.split("\n");
    let pos = 0;
    for (const line of lines) {
      const t = line.trim();
      if (t) {
        const lead = line.indexOf(t);
        const charStart = pos + Math.max(0, lead);
        blocks.push({
          id: `b-${blocks.length}-${hashShort(t)}`,
          text: t,
          index: blocks.length,
          charStart,
          charEnd: charStart + t.length,
        });
      }
      pos += line.length + 1;
    }
  }

  return blocks.slice(0, maxBlocks);
}

function hashShort(s: string): string {
  let h = 0;
  for (let i = 0; i < Math.min(s.length, 80); i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}
