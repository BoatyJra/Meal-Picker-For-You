import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

test("hosted ChatGPT configuration exposes an approved PKCE sign-in URL", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "meal-picker-chatgpt-hosted-"));
  const keys = ["DATA_DIR", "RECIPE_PASSWORD", "SIWC_LOCAL_ENABLED", "OPENAI_CHATGPT_CLIENT_ID", "OPENAI_CHATGPT_REDIRECT_URI", "CHATGPT_TOKEN_ENCRYPTION_KEY", "PUBLIC_APP_URL"];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  Object.assign(process.env, {
    DATA_DIR: directory,
    RECIPE_PASSWORD: "hosted-test-password",
    SIWC_LOCAL_ENABLED: "false",
    OPENAI_CHATGPT_CLIENT_ID: "oaiapp_meal_picker_test",
    OPENAI_CHATGPT_REDIRECT_URI: "https://meal-picker.example/auth/chatgpt/callback",
    CHATGPT_TOKEN_ENCRYPTION_KEY: "test-encryption-key-that-is-not-production",
    PUBLIC_APP_URL: "https://meal-picker.example/",
  });
  const { default: app } = await import(`../server/app.js?hosted-test=${Date.now()}`);
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  try {
    const status = await (await fetch(`${baseUrl}/api/chatgpt/status`)).json();
    assert.equal(status.available, true);
    assert.equal(status.hosted, true);
    assert.equal(status.connected, false);

    const response = await fetch(`${baseUrl}/api/chatgpt/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "hosted-test-password" }),
    });
    assert.equal(response.status, 200);
    const authorization = new URL((await response.json()).url);
    assert.equal(authorization.searchParams.get("client_id"), "oaiapp_meal_picker_test");
    assert.equal(authorization.searchParams.get("redirect_uri"), "https://meal-picker.example/auth/chatgpt/callback");
    assert.equal(authorization.searchParams.get("code_challenge_method"), "S256");
    assert.equal(authorization.searchParams.has("agent_name_hint"), false);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await rm(directory, { recursive: true, force: true });
  }
});
