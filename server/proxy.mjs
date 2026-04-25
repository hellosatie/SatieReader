import http from "node:http";
import { config as loadEnv } from "dotenv";

loadEnv();

const PORT = Number(process.env.API_PORT || 8787);
const DOUBAO_ENDPOINT = "https://ark.cn-beijing.volces.com/api/v3/responses";
const DEFAULT_MODEL = "doubao-seed-2-0-pro-260215";

function json(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(payload));
}

function extractOutputText(payload) {
  if (!payload || typeof payload !== "object") return "";
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }
  const chunks = [];
  for (const item of payload.output ?? []) {
    for (const c of item.content ?? []) {
      if (c.type === "output_text" && typeof c.text === "string") {
        chunks.push(c.text);
      }
    }
  }
  return chunks.join("\n").trim();
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    json(res, 204, {});
    return;
  }

  if (req.method !== "POST" || req.url !== "/api/doubao") {
    json(res, 404, { error: "Not Found" });
    return;
  }

  const apiKey = process.env.DOUBAO_API_KEY?.trim() ?? "";
  const model = process.env.DOUBAO_MODEL?.trim() || DEFAULT_MODEL;
  if (!apiKey) {
    json(res, 500, { error: "服务端缺少 DOUBAO_API_KEY 配置" });
    return;
  }

  let raw = "";
  req.on("data", (chunk) => {
    raw += chunk.toString("utf8");
    if (raw.length > 200_000) {
      req.destroy();
    }
  });

  req.on("end", async () => {
    try {
      const body = raw ? JSON.parse(raw) : {};
      const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
      if (!prompt) {
        json(res, 400, { error: "缺少 prompt" });
        return;
      }

      const upstream = await fetch(DOUBAO_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          input: [
            {
              role: "user",
              content: [{ type: "input_text", text: prompt }],
            },
          ],
        }),
      });

      if (!upstream.ok) {
        const err = await upstream.text();
        json(res, upstream.status, {
          error: (err || `豆包接口错误 ${upstream.status}`).slice(0, 500),
        });
        return;
      }

      const data = await upstream.json();
      const text = extractOutputText(data);
      if (!text) {
        json(res, 502, { error: "模型未返回内容" });
        return;
      }
      json(res, 200, { text });
    } catch (error) {
      const message = error instanceof Error ? error.message : "服务异常";
      json(res, 500, { error: message });
    }
  });
});

server.listen(PORT, () => {
  console.log(`[doubao-proxy] listening on http://localhost:${PORT}`);
});
