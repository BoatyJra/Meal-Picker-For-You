import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import net from "node:net";

for (const entry of ["server/index.js", "server/dev.js", "tests/serve-functions.js"]) {
for (const ownerPassword of ["test-owner-password", "รหัสผ่านของเรา💖"]) {
test(`${entry} (${ownerPassword === "test-owner-password" ? "ASCII" : "Unicode"} password): all-category CRUD, authentication, validation, and restart persistence`, async () => {
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
      env: { ...process.env, PORT: String(port), DATA_DIR: directory, DEV_DATA_DIR: directory, DEV_RECIPE_PASSWORD: ownerPassword, RECIPE_PASSWORD: ownerPassword, TURSO_DATABASE_URL: entry === "server/dev.js" ? "libsql://must-not-connect.example" : "", TURSO_AUTH_TOKEN: "", VERCEL: "" },
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
  const post = (body, password = ownerPassword) => fetch(`${url}/api/recipes`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, password }),
  });
  try {
    await start();
    const initial = await (await fetch(`${url}/api/recipes`)).json();
    assert.equal(initial.length, 8);
    assert.equal((await post(recipe, "incorrect")).status, 401);
    assert.equal((await post(recipe, null)).status, 401);
    assert.equal((await post({ ...recipe, video: "https://tiktok.com.evil.example/video/123" })).status, 400);
    assert.equal((await post({ ...recipe, ingredients: [] })).status, 400);
    const response = await post(recipe);
    assert.equal(response.status, 201);
    const saved = await response.json();
    assert.ok(saved.id);
    assert.equal(Object.hasOwn(saved, "password"), false);
    assert.equal((await post(recipe)).status, 409);
    await stop();
    await start();
    const reloaded = await (await fetch(`${url}/api/recipes`)).json();
    assert.equal(reloaded.length, 9);
    assert.deepEqual(reloaded.find((item) => item.id === saved.id).ingredients, recipe.ingredients);
    assert.equal(reloaded.find((item) => item.id === saved.id).video, recipe.video);
    assert.equal(Object.hasOwn(reloaded.find((item) => item.id === saved.id), "password"), false);
    const request = (method, body, password = ownerPassword) => fetch(`${url}/api/menus`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, password }),
    });
    const all = await (await fetch(`${url}/api/menus`)).json();
    assert.equal(all.length, 69);
    const removedSeeds = [];
    for (const mode of ["food", "snacks", "home"]) {
      const menu = { ...recipe, name: "Shared name across modes", mode, category: "Test tag" };
      assert.equal((await request("POST", menu, "wrong")).status, 401);
      const created = await request("POST", menu);
      assert.equal(created.status, 201);
      const added = await created.json();
      assert.equal((await request("POST", menu)).status, 409);
      const edited = await request("PUT", { ...added, name: "Edited menu", category: "New tag" });
      assert.equal(edited.status, 200);
      assert.equal((await edited.json()).category, "New tag");
      assert.equal((await request("DELETE", { id: added.id }, "wrong")).status, 401);
      assert.equal((await request("DELETE", { id: added.id })).status, 200);
      const seed = all.find((item) => item.mode === mode);
      assert.equal((await request("DELETE", { id: seed.id })).status, 200);
      removedSeeds.push(seed.id);
    }
    assert.equal((await request("PUT", { ...recipe, mode: "food", category: "Test", id: -1 })).status, 400);
    assert.equal((await request("DELETE", { id: 999999 })).status, 404);
    assert.equal((await request("POST", { ...recipe, mode: "unknown", category: "Test" })).status, 400);
    assert.equal((await request("PUT", { ...recipe, mode: "food", category: "Test", id: 999999 })).status, 404);
    await stop();
    await start();
    const persisted = await (await fetch(`${url}/api/menus`)).json();
    assert.equal(persisted.length, 66);
    assert.ok(removedSeeds.every((id) => !persisted.some((item) => item.id === id)));
  } finally {
    await stop();
    await rm(directory, { recursive: true, force: true });
  }
});
}
}

test("Existing recipes are migrated without modifying the original table", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "meal-picker-migrate-"));
  try {
    const result = spawnSync(process.execPath, ["--input-type=module", "-e", `
      import { createClient } from "@libsql/client";
      import { pathToFileURL } from "node:url";
      import path from "node:path";
      const source = createClient({ url: pathToFileURL(path.join(process.env.DATA_DIR, "recipes.sqlite")).href });
      const old = { name: "Existing family recipe", category: "Custom", video: "", ingredients: ["Chicken 300 g"], steps: ["Cook thoroughly"] };
      await source.execute("CREATE TABLE recipes (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL COLLATE NOCASE UNIQUE, body TEXT NOT NULL)");
      await source.execute({ sql: "INSERT INTO recipes (name, body) VALUES (?, ?)", args: [old.name, JSON.stringify(old)] });
      const { listMenus, getClient } = await import("./server/database.js");
      const menus = await listMenus();
      const legacy = await source.execute("SELECT body FROM recipes");
      console.log(JSON.stringify({ count: menus.length, migrated: menus.find(menu => menu.name === old.name), original: JSON.parse(legacy.rows[0].body) }));
      source.close(); getClient().close();
    `], { env: { ...process.env, DATA_DIR: directory, TURSO_DATABASE_URL: "", TURSO_AUTH_TOKEN: "", VERCEL: "" }, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    const data = JSON.parse(result.stdout);
    assert.equal(data.count, 61);
    assert.equal(data.migrated.mode, "home");
    assert.deepEqual(data.migrated.ingredients, data.original.ingredients);
    assert.equal(data.original.name, "Existing family recipe");
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("Vercel refuses temporary local storage when Turso credentials are missing", () => {
  const result = spawnSync(process.execPath, ["--input-type=module", "-e",
    'import { getClient } from "./server/database.js"; try { getClient(); process.exit(1); } catch (error) { console.log(error.message); }'], {
    env: { ...process.env, VERCEL: "1", TURSO_DATABASE_URL: "", TURSO_AUTH_TOKEN: "" }, encoding: "utf8",
  });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Configure TURSO_DATABASE_URL and TURSO_AUTH_TOKEN/);
});
