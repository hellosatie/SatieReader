import { askDoubaoText } from "./translate";

export interface DictionarySense {
  definition: string;
  examples: string[];
}

export interface DictionaryResult {
  word: string;
  phonetic?: string;
  senses: DictionarySense[];
  roots: string[];
}

export async function fetchDictionary(word: string): Promise<DictionaryResult | null> {
  const w = word.trim().toLowerCase().replace(/[^a-z'\-]/gi, "");
  if (!w || w.length > 45) return null;
  const modelResult = await askModelDictionary(w);
  if (!modelResult) return null;
  const roots = modelResult.roots.length > 0 ? modelResult.roots : inferRoots(modelResult.word);
  return {
    word: modelResult.word,
    phonetic: modelResult.phonetic,
    senses: modelResult.senses.slice(0, 12),
    roots,
  };
}

async function askModelDictionary(word: string): Promise<DictionaryResult | null> {
  try {
    const prompt = [
      "你是英语词汇学习助手。",
      `请针对单词 "${word}" 输出 JSON，不要输出 JSON 以外任何文本。`,
      "JSON schema:",
      "{",
      '  "word": "string",',
      '  "phonetic": "string | empty",',
      '  "senses": [{"definition":"英文释义","examples":["英文例句1","英文例句2"]}],',
      '  "roots": ["词根/词缀记忆点1","词根/词缀记忆点2"]',
      "}",
      "要求：",
      "1) senses 给 2~6 条；",
      "2) examples 每条 sense 0~2 条，尽量简短；",
      "3) roots 重点给词根词缀拆解与记忆点，中文表达；",
      "4) 若信息不确定，宁可留空也不要编造。",
    ].join("\n");
    const raw = await askDoubaoText(prompt);
    const parsed = safeParseModelJson(raw);
    if (!parsed) return null;
    return normalizeDictionaryResult(parsed, word);
  } catch {
    return null;
  }
}

function safeParseModelJson(raw: string): unknown {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const jsonText = (fenced?.[1] ?? raw).trim();
  try {
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
}

function normalizeDictionaryResult(payload: unknown, fallbackWord: string): DictionaryResult | null {
  if (!payload || typeof payload !== "object") return null;
  const data = payload as {
    word?: unknown;
    phonetic?: unknown;
    senses?: unknown;
    roots?: unknown;
  };

  const word = typeof data.word === "string" && data.word.trim() ? data.word.trim() : fallbackWord;
  const phonetic = typeof data.phonetic === "string" && data.phonetic.trim() ? data.phonetic.trim() : undefined;
  const sensesRaw = Array.isArray(data.senses) ? data.senses : [];
  const senses: DictionarySense[] = sensesRaw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const x = item as { definition?: unknown; examples?: unknown };
      const definition =
        typeof x.definition === "string" && x.definition.trim() ? x.definition.trim() : "";
      if (!definition) return null;
      const examples = Array.isArray(x.examples)
        ? x.examples
            .filter((e): e is string => typeof e === "string" && e.trim().length > 0)
            .map((e) => e.trim())
            .slice(0, 2)
        : [];
      return { definition, examples };
    })
    .filter((v): v is DictionarySense => Boolean(v))
    .slice(0, 12);
  const roots = Array.isArray(data.roots)
    ? data.roots
        .filter((r): r is string => typeof r === "string" && r.trim().length > 0)
        .map((r) => r.trim())
        .slice(0, 6)
    : [];
  if (senses.length === 0 && roots.length === 0) return null;
  return { word, phonetic, senses, roots };
}

function inferRoots(word: string): string[] {
  const w = word.toLowerCase();
  const hints: string[] = [];

  const prefixes: Array<[string, string]> = [
    ["un", "un-: 否定"],
    ["re", "re-: 再次/回"],
    ["pre", "pre-: 在前"],
    ["sub", "sub-: 下/次级"],
    ["inter", "inter-: 之间"],
    ["trans", "trans-: 跨越"],
    ["mis", "mis-: 错误地"],
    ["dis", "dis-: 否定/相反"],
  ];
  for (const [p, hint] of prefixes) {
    if (w.startsWith(p) && w.length > p.length + 2) hints.push(hint);
  }

  const suffixes: Array<[string, string]> = [
    ["tion", "-tion: 名词后缀（行为/结果）"],
    ["sion", "-sion: 名词后缀（状态/行为）"],
    ["ment", "-ment: 名词后缀（结果/状态）"],
    ["ness", "-ness: 性质/状态"],
    ["able", "-able: 可...的"],
    ["ible", "-ible: 可...的"],
    ["ive", "-ive: 具有...性质"],
    ["ous", "-ous: 充满...的"],
    ["ist", "-ist: 人/主义者"],
    ["logy", "-logy: 学科/学说"],
  ];
  for (const [s, hint] of suffixes) {
    if (w.endsWith(s) && w.length > s.length + 2) hints.push(hint);
  }

  const stem = w
    .replace(/^(un|re|pre|sub|inter|trans|mis|dis)/, "")
    .replace(/(tion|sion|ment|ness|able|ible|ive|ous|ist|logy)$/, "");
  if (stem.length >= 3) {
    hints.push(`词干建议: ${stem}`);
  }

  return [...new Set(hints)].slice(0, 6);
}
