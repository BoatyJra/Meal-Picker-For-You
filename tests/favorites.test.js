import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import net from "node:net";

test("owner can favorite a menu and the favorite survives restart", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "meal-picker-favorite-"));
  const password = "favorite-test-password";
  const port = await new Promise((resolve) => {
    const socket = net.createServer();
    socket.listen(0, "127.0.0.1", () => { const assigned = socket.address().port; socket.close(() => resolve(assigned)); });
  });
  const baseUrl = `http://127.0.0.1:${port}`;
  let server;
  let errors = "";

  async function start() {
    server = spawn(process.execPath, ["server/index.js"], {
      env: { ...process.env, PORT: String(port), DATA_DIR: directory, RECIPE_PASSWORD: password,
        OPENAI_API_KEY: "", SIWC_LOCAL_ENABLED: "false", TURSO_DATABASE_URL: "", TURSO_AUTH_TOKEN: "", VERCEL: "" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    server.stderr.on("data", (chunk) => { errors += chunk.toString(); });
    for (let attempt = 0; attempt < 100; attempt++) {
      try { if ((await fetch(`${baseUrl}/api/health`)).ok) return; } catch { /* Wait for startup. */ }
      if (server.exitCode !== null) throw new Error(errors);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error(`API startup timed out: ${errors}`);
  }

  async function stop() {
    if (!server || server.exitCode !== null) return;
    const exited = new Promise((resolve) => server.once("exit", resolve));
    server.kill();
    await exited;
  }

  const setFavorite = (menuId, favorite, ownerPassword = password) => fetch(`${baseUrl}/api/favorites`, {
    method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ menuId, favorite, password: ownerPassword }),
  });

  try {
    await start();
    const menus = await (await fetch(`${baseUrl}/api/menus`)).json();
    const menuId = menus[0].id;
    assert.equal((await setFavorite(menuId, true, "wrong-password")).status, 401);
    const response = await setFavorite(menuId, true);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { menuId, favorite: true });
    assert.equal((await (await fetch(`${baseUrl}/api/menus`)).json()).find((menu) => menu.id === menuId).favorite, true);

    await stop();
    await start();
    assert.equal((await (await fetch(`${baseUrl}/api/menus`)).json()).find((menu) => menu.id === menuId).favorite, true);
  } finally {
    await stop();
    await rm(directory, { recursive: true, force: true });
  }
});
