export async function askDoubaoText(prompt: string): Promise<string> {
  const res = await fetch("/api/doubao", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err.slice(0, 260) || `代理接口错误 ${res.status}`);
  }
  const json = (await res.json()) as { text?: string; error?: string };
  const text = json.text?.trim() ?? "";
  if (!text) throw new Error("模型未返回内容");
  return text;
}

export async function translateToZh(text: string): Promise<string> {
  const q = text.trim().slice(0, 5000);
  if (!q) return "";
  const prompt = [
    "请将下面英文翻译成自然、准确、简洁的中文。",
    "要求：",
    "1) 保留原意，不要扩写；",
    "2) 若是词/词组，给最贴合上下文的译法；",
    "3) 仅输出翻译结果本身，不要额外说明。",
    "",
    q,
  ].join("\n");
  return askDoubaoText(prompt);
}

export async function explainGrammarWithDoubao(sentence: string): Promise<string> {
  const prompt = [
    "你是面向中文学习者的英语语法老师。",
    "请分析这句英文，输出中文讲解，包含：",
    "- 句子主干（主谓宾/主系表等）",
    "- 关键语法点（时态、从句、非谓语、语态等）",
    "- 重要搭配与可替换表达",
    "要求：条理清晰、简洁，控制在 350 字以内。",
    "",
    `句子：${sentence.trim()}`,
  ].join("\n");
  return askDoubaoText(prompt);
}
