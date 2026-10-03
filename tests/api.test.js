import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import net from "node:net";

for (const entry of ["server/index.js", "tests/serve-functions.js"]) {
test(`${entry}: authentication, validation, duplicate detection, and restart persistence`, async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "meal-picker-api-"));
  const port = await new Promise((resolve) => {
    const socket = net.createServer();
    socket.listen(0, "127.0.0.1", () => { const assigned = socket.address().port; socket.close(() => resolve(assigned)); });
  });
  const url = `http://127.0.0.1:${port}`;
  let server;
  let errors = "";
  async function start() {
    server = spawn(process.execPath, [entry], {
      env: { ...process.env, PORT: String(port), DATA_DIR: directory, RECIPE_PASSWORD: "test-owner-password", TURSO_DATABASE_URL: "", TURSO_AUTH_TOKEN: "", VERCEL: "" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    server.stderr.on("data", (chunk) => { errors += chunk.toString(); });
    for (let attempt = 0; attempt < 100; attempt++) {
      try { if ((await fetch(`${url}/api/health`)).ok) return; } catch { /* Wait for startup. */ }
      if (server.exitCode !== null) throw new Error(errors);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`API startup timed out: ${errors}`);
  }
  async function stop() {
    if (!server || server.exitCode !== null) return;
    const exited = new Promise((resolve) => server.once("exit", resolve));
    server.kill();
    await exited;
  }
  const recipe = { name: "Test recipe", video: "https://www.tiktok.com/@cook/video/123", ingredients: ["Chicken 300 g"], steps: ["Cook thoroughly"] };
  const post = (body, password = "test-owner-password") => fetch(`${url}/api/recipes`, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${password}` }, body: JSON.stringify(body),
  });
  try {
    await start();
    const initial = await (await fetch(`${url}/api/recipes`)).json();
    assert.equal(initial.length, 8);
    assert.equal((await post(recipe, "incorrect")).status, 401);
    assert.equal((await post({ ...recipe, video: "https://tiktok.com.evil.example/video/123" })).status, 400);
    assert.equal((await post({ ...recipe, ingredients: [] })).status, 400);
    const response = await post(recipe);
    assert.equal(response.status, 201);
    const saved = await response.json();
    assert.ok(saved.id);
    assert.equal((await post(recipe)).status, 409);
    await stop();
    await start();
    const reloaded = await (await fetch(`${url}/api/recipes`)).json();
    assert.equal(reloaded.length, 9);
    assert.deepEqual(reloaded.find((item) => item.id === saved.id).ingredients, recipe.ingredients);
    assert.equal(reloaded.find((item) => item.id === saved.id).video, recipe.video);
  } finally {
    await stop();
    await rm(directory, { recursive: true, force: true });
  }
});
}

test("Vercel refuses temporary local storage when Turso credentials are missing", () => {
  const result = spawnSync(process.execPath, ["--input-type=module", "-e",
    'import { getClient } from "./server/database.js"; try { getClient(); process.exit(1); } catch (error) { console.log(error.message); }'], {
    env: { ...process.env, VERCEL: "1", TURSO_DATABASE_URL: "", TURSO_AUTH_TOKEN: "" }, encoding: "utf8",
  });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Configure TURSO_DATABASE_URL and TURSO_AUTH_TOKEN/);
});
