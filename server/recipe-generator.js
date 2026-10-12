import { cleanMenu, tiktokSearchUrl, tiktokVideoId, validateMenu } from "../src/recipe-schema.js";
import { getChatGPTPlanProvider } from "./chatgpt-plan.js";

const recipeSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    category: { type: "string", maxLength: 40 },
    ingredients: {
      type: "array",
      minItems: 1,
      maxItems: 30,
      items: { type: "string", maxLength: 1000 },
    },
    steps: {
      type: "array",
      minItems: 1,
      maxItems: 30,
      items: { type: "string", maxLength: 1000 },
    },
  },
  required: ["category", "ingredients", "steps"],
};

function outputText(response) {
  for (const item of response.output || []) {
    if (item.type !== "message") continue;
    for (const content of item.content || []) {
      if (content.type === "output_text" && typeof content.text === "string") return content.text;
    }
  }
  return "";
}

function webSources(response) {
  const urls = [];
  function add(title, value) {
    try {
      const url = new URL(value);
      if ((url.protocol === "https:" || url.protocol === "http:") && !url.username && !url.password) {
        urls.push({ title: title || "แหล่งข้อมูล", url: url.href });
      }
    } catch { /* Ignore malformed source URLs. */ }
  }
  for (const item of response.output || []) {
    for (const source of item.action?.sources || []) {
      if (typeof source.url === "string") add(source.title, source.url);
    }
    for (const content of item.content || []) {
      for (const annotation of content.annotations || []) {
        const url = annotation.url || annotation.url_citation?.url;
        const title = annotation.title || annotation.url_citation?.title;
        if (typeof url === "string") add(title, url);
      }
    }
  }
  return [...new Map(urls.map((source) => [source.url, source])).values()].slice(0, 6);
}

function generationError(message, status = 502) {
  const error = new Error(message);
  error.status = status;
  error.publicMessage = message;
  return error;
}

function cleanGeneratedLine(value) {
  return String(value)
    .replace(/\s*\(\[[^\]]+\]\(https?:\/\/[^)]+\)\)/gi, "")
    .replace(/\s*\[[^\]]+\]\(https?:\/\/[^)]+\)/gi, "")
    .replace(/\s+https?:\/\/\S+/gi, "")
    .replace(/^\s*\d+[.)]\s*/, "")
    .trim();
}

function cleanGeneratedLines(values, { cookingSteps = false } = {}) {
  if (!Array.isArray(values)) return [];
  return values.map(cleanGeneratedLine)
    .filter((line) => line && (!cookingSteps || !/^(หมายเหตุ|note)\s*[:：]?/i.test(line)));
}

async function streamedResult(response) {
  if (!response.body) throw generationError("ไม่ได้รับข้อมูลสูตรจาก ChatGPT");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let completed;
  const items = [];
  function consume(block) {
    const data = block.split(/\r?\n/).filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim()).join("\n");
    if (!data || data === "[DONE]") return;
    let event;
    try { event = JSON.parse(data); } catch { return; }
    if (event.type === "response.output_text.delta") text += event.delta || "";
    if (event.type === "response.output_item.done" && event.item) items.push(event.item);
    if (event.type === "response.completed") completed = event.response;
    if (event.type === "response.failed" || event.type === "response.incomplete") {
      const code = event.response?.error?.code || event.error?.code || "";
      if (["subscription_sharing_usage_limit_exceeded", "subscription_sharing_usage_unavailable"].includes(code)) {
        throw generationError("ถึงขีดจำกัดการใช้งานแพ็กเกจ ChatGPT แล้ว กรุณาตรวจสอบ Usage ใน ChatGPT");
      }
      throw generationError("ChatGPT สร้างสูตรไม่สำเร็จ กรุณาลองใหม่");
    }
  }
  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const blocks = buffer.split(/\r?\n\r?\n/);
    const tail = blocks.pop() || "";
    for (const block of blocks) consume(block);
    if (done) { if (tail.trim()) consume(tail); break; }
    buffer = tail;
  }
  if (!completed) throw generationError("การตอบกลับจาก ChatGPT สิ้นสุดก่อนสร้างสูตรเสร็จ");
  return { response: completed.output?.length ? completed : { ...completed, output: items }, text };
}

export async function generateRecipe(name, fetchImpl = fetch, providerOverride) {
  const planProvider = arguments.length >= 3 ? providerOverride : await getChatGPTPlanProvider();
  const apiKey = process.env.OPENAI_API_KEY;
  if (!planProvider && !apiKey) {
    const error = new Error("No ChatGPT plan connection or OPENAI_API_KEY is configured");
    error.status = 503;
    error.publicMessage = "กรุณาเชื่อมต่อ ChatGPT Plus หรือตั้งค่า OpenAI API key ก่อนสร้างสูตร";
    throw error;
  }

  const response = await fetchImpl("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Authorization": `Bearer ${planProvider?.token || apiKey}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(55000),
    body: JSON.stringify({
      model: planProvider?.model || process.env.OPENAI_RECIPE_MODEL || "gpt-5.6-luna",
      instructions: [
        "You create practical Thai-language home recipes for exactly two people.",
        "Search the web for a trustworthy version of the requested dish and a closely matching TikTok cooking video.",
        "Use metric quantities, common Thai grocery ingredients, concise numbered cooking actions, and food-safe temperatures or doneness cues where relevant.",
        "Every step must contain only a cooking action. Do not number the steps and do not add notes about search results.",
        "Never place citations, Markdown links, domains, or URLs inside category, ingredients, or steps. Return only the requested structured recipe fields; source URLs are collected separately by the application.",
      ].join(" "),
      input: [{ role: "user", content: `สร้างสูตรเมนู “${name}” สำหรับ 2 คน พร้อมค้นหาวิดีโอสอนทำเมนูนี้บน TikTok` }],
      tools: [{ type: "web_search", search_context_size: "low" }],
      tool_choice: "required",
      include: ["web_search_call.action.sources"],
      store: false,
      ...(planProvider ? { stream: true } : { max_output_tokens: 1800 }),
      text: { format: { type: "json_schema", name: "thai_recipe", strict: true, schema: recipeSchema } },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    const error = new Error(`OpenAI request failed (${response.status}): ${detail.slice(0, 300)}`);
    error.status = 502;
    let code = "";
    try { code = JSON.parse(detail)?.error?.code || ""; } catch { /* Keep the generic message for non-JSON errors. */ }
    if (response.status === 401) error.publicMessage = "OpenAI API key ไม่ถูกต้อง กรุณาตรวจสอบการตั้งค่าฝั่งเซิร์ฟเวอร์";
    else if (response.status === 429 && ["insufficient_quota", "credit_balance_exhausted"].includes(code)) {
      error.publicMessage = "OpenAI API ไม่มีเครดิตคงเหลือ กรุณาเติมเครดิตในหน้า Billing";
    } else if (response.status === 429) error.publicMessage = "OpenAI API ถูกเรียกใช้งานถี่เกินไป กรุณารอสักครู่แล้วลองใหม่";
    else error.publicMessage = "สร้างสูตรไม่สำเร็จ ลองใหม่อีกครั้งนะ";
    throw error;
  }

  const streamed = planProvider ? await streamedResult(response) : null;
  const result = streamed?.response || await response.json();
  const sources = webSources(result);
  let generated;
  try { generated = JSON.parse(streamed?.text || outputText(result)); }
  catch {
    const error = new Error("OpenAI returned an invalid recipe");
    error.status = 502;
    error.publicMessage = "สูตรที่สร้างมายังไม่สมบูรณ์ ลองใหม่อีกครั้งนะ";
    throw error;
  }

  const recipe = {
    mode: "home",
    name,
    category: generated.category,
    video: sources.find((source) => tiktokVideoId(source.url))?.url || tiktokSearchUrl(name),
    ingredients: cleanGeneratedLines(generated.ingredients),
    steps: cleanGeneratedLines(generated.steps, { cookingSteps: true }),
  };
  const invalid = validateMenu(recipe);
  if (invalid) {
    const error = new Error(`Generated recipe failed validation: ${invalid}`);
    error.status = 502;
    error.publicMessage = "สูตรที่สร้างมายังไม่สมบูรณ์ ลองใหม่อีกครั้งนะ";
    throw error;
  }
  return { recipe: cleanMenu(recipe), sources };
}

export const generatorInternals = { cleanGeneratedLine, cleanGeneratedLines, outputText, streamedResult, webSources };
