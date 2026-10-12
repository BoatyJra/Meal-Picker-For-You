import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { generateRecipe, generatorInternals } from "../server/recipe-generator.js";

test("POST /api/generate-recipe reuses a normalized persistent recipe draft", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "meal-picker-recipe-cache-"));
  const previous = {
    DATA_DIR: process.env.DATA_DIR,
    RECIPE_PASSWORD: process.env.RECIPE_PASSWORD,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    SIWC_LOCAL_ENABLED: process.env.SIWC_LOCAL_ENABLED,
  };
  process.env.DATA_DIR = directory;
  process.env.RECIPE_PASSWORD = "cache-test-password";
  process.env.OPENAI_API_KEY = "test-key";
  process.env.SIWC_LOCAL_ENABLED = "false";
  const nativeFetch = globalThis.fetch;
  let providerCalls = 0;
  mock.method(globalThis, "fetch", async (url) => {
    assert.equal(url, "https://api.openai.com/v1/responses");
    providerCalls += 1;
    const recipe = { category: "อาหารจานเดียว", ingredients: ["ข้าวสวย 300 กรัม"], steps: ["ผัดจนสุกทั่ว"] };
    return new Response(JSON.stringify({ output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(recipe) }] }] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
  const { default: app } = await import(`../server/app.js?cache-test=${Date.now()}`);
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/generate-recipe`;
  const request = (name, refresh = false) => nativeFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, refresh, password: "cache-test-password" }),
  });
  try {
    const first = await (await request("  ผัดกะเพรา  ")).json();
    const second = await (await request("ผัดกะเพรา")).json();
    assert.equal(first.cached, false);
    assert.equal(second.cached, true);
    assert.equal(second.recipe.name, "ผัดกะเพรา");
    assert.deepEqual(second.recipe, first.recipe);
    assert.equal(providerCalls, 1);
    const refreshed = await (await request("ผัดกะเพรา", true)).json();
    assert.equal(refreshed.cached, false);
    assert.equal(providerCalls, 2);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    mock.restoreAll();
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await rm(directory, { recursive: true, force: true });
  }
});

test("Recipe generator requests web search and returns a validated recipe with a sourced TikTok link", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-key";
  try {
    const recipe = { category: "อาหารจานเดียว", ingredients: ["ข้าวสวย 300 กรัม", "กะเพรา 20 กรัม"], steps: ["ผัดจนเนื้อสุกทั่ว", "เสิร์ฟกับข้าวสวย"] };
    const result = await generateRecipe("ผัดกะเพรา", async (url, options) => {
      assert.equal(url, "https://api.openai.com/v1/responses");
      assert.equal(options.headers.Authorization, "Bearer test-key");
      const request = JSON.parse(options.body);
      assert.equal(request.tools[0].type, "web_search");
      assert.equal(request.text.format.type, "json_schema");
      return { ok: true, json: async () => ({ output: [
        { type: "web_search_call", action: { sources: [
          { title: "สูตรผัดกะเพรา", url: "https://example.com/pad-kaprao" },
          { title: "วิดีโอผัดกะเพรา", url: "https://www.tiktok.com/@cook/video/123" },
        ] } },
        { type: "message", content: [{ type: "output_text", text: JSON.stringify(recipe), annotations: [] }] },
      ] }) };
    }, null);
    assert.equal(result.recipe.name, "ผัดกะเพรา");
    assert.equal(result.recipe.video, "https://www.tiktok.com/@cook/video/123");
    assert.deepEqual(result.recipe.ingredients, recipe.ingredients);
    assert.equal(result.sources.length, 2);
  } finally {
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
  }
});

test("Recipe generator fails safely when the server API key is missing", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    await assert.rejects(() => generateRecipe("ข้าวผัด", async () => { throw new Error("fetch should not run"); }, null), (error) => error.status === 503 && /API key/.test(error.publicMessage));
  } finally {
    if (previousKey !== undefined) process.env.OPENAI_API_KEY = previousKey;
  }
});

test("Recipe generator reports exhausted API credits clearly", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-key";
  try {
    await assert.rejects(() => generateRecipe("ข้าวผัด", async () => ({
      ok: false,
      status: 429,
      text: async () => JSON.stringify({ error: { code: "credit_balance_exhausted" } }),
    }), null), (error) => error.status === 502 && /ไม่มีเครดิต/.test(error.publicMessage));
  } finally {
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
  }
});

test("Recipe generator supports the streaming ChatGPT plan contract", async () => {
  const recipe = { category: "อาหารจานเดียว", ingredients: ["กุ้ง 200 กรัม"], steps: ["ผัดกุ้งจนสุก"] };
  const events = [
    { type: "response.output_text.delta", delta: JSON.stringify(recipe) },
    { type: "response.output_item.done", item: { type: "web_search_call", action: { sources: [{ title: "TikTok", url: "https://www.tiktok.com/@cook/video/456" }] } } },
    { type: "response.completed", response: { output: [] } },
  ].map((event) => `data: ${JSON.stringify(event)}\n\n`).join("");
  const result = await generateRecipe("กุ้งผัด", async (_url, options) => {
    const request = JSON.parse(options.body);
    assert.equal(options.headers.Authorization, "Bearer oauth-token");
    assert.equal(request.model, "chatgpt-model");
    assert.equal(request.stream, true);
    assert.equal(request.store, false);
    assert.equal(Object.hasOwn(request, "max_output_tokens"), false);
    return new Response(events, { status: 200, headers: { "Content-Type": "text/event-stream" } });
  }, { type: "chatgpt", token: "oauth-token", model: "chatgpt-model" });
  assert.equal(result.recipe.video, "https://www.tiktok.com/@cook/video/456");
  assert.deepEqual(result.recipe.ingredients, recipe.ingredients);
});

test("Recipe generator removes inline citations and falls back to a TikTok search", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-key";
  try {
    const generated = {
      category: "อาหารจานเดียว",
      ingredients: ["หมูสับ 250 กรัม ([source](https://example.com/recipe))"],
      steps: ["1. ผัดหมูจนสุก ([source](https://example.com/recipe))", "หมายเหตุ: TikTok จำกัดการเข้าถึง"],
    };
    const result = await generateRecipe("กะเพราหมูสับ", async () => ({
      ok: true,
      json: async () => ({ output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(generated) }] }] }),
    }), null);
    assert.deepEqual(result.recipe.ingredients, ["หมูสับ 250 กรัม"]);
    assert.deepEqual(result.recipe.steps, ["ผัดหมูจนสุก"]);
    assert.match(result.recipe.video, /^https:\/\/www\.tiktok\.com\/search\?q=/);
  } finally {
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
  }
});

test("Citation cleanup handles the format shown by web-search results", () => {
  assert.equal(generatorInternals.cleanGeneratedLine("ทอดไข่จนสุก ([fda.gov](https://www.fda.gov/example?utm_source=openai))"), "ทอดไข่จนสุก");
});
