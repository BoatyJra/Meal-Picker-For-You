import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { getAppState, setAppState } from "./database.js";

const issuer = "https://auth.openai.com";
const authorizationEndpoint = `${issuer}/api/accounts/authorize`;
const tokenEndpoint = `${issuer}/api/accounts/oauth/token`;
const discoveryEndpoint = `${issuer}/.well-known/openid-configuration`;
const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
const resource = "https://api.openai.com/v1";
const scopes = "openid profile email offline_access resource.invoke chatgpt.tokens.use.direct";
const storeName = "chatgpt-auth-v1";

function hostedConfig() {
  const clientId = process.env.OPENAI_CHATGPT_CLIENT_ID;
  const redirectUri = process.env.OPENAI_CHATGPT_REDIRECT_URI;
  const encryptionKey = process.env.CHATGPT_TOKEN_ENCRYPTION_KEY;
  return clientId && redirectUri && encryptionKey ? { clientId, redirectUri, encryptionKey } : null;
}

function available() {
  return Boolean(hostedConfig()) || (!process.env.VERCEL && process.env.SIWC_LOCAL_ENABLED !== "false");
}

function storagePath() {
  return path.resolve(process.env.CHATGPT_DATA_DIR || process.env.DATA_DIR || "data", "chatgpt-auth.json");
}

async function readStore() {
  const hosted = hostedConfig();
  if (hosted) {
    const encrypted = await getAppState(storeName);
    if (!encrypted) return { hostId: `urn:uuid:${randomUUID()}`, profile: null, pending: {} };
    return decryptStore(encrypted, hosted.encryptionKey);
  }
  try { return JSON.parse(await readFile(storagePath(), "utf8")); }
  catch (error) {
    if (error.code !== "ENOENT") throw error;
    return { hostId: `urn:uuid:${randomUUID()}`, profile: null, pending: {} };
  }
}

async function writeStore(store) {
  const hosted = hostedConfig();
  if (hosted) return setAppState(storeName, encryptStore(store, hosted.encryptionKey));
  const destination = storagePath();
  await mkdir(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.${process.pid}.${randomBytes(6).toString("hex")}.tmp`;
  await writeFile(temporary, `${JSON.stringify(store, null, 2)}\n`, { mode: 0o600 });
  await rename(temporary, destination);
  await chmod(destination, 0o600);
}

function encryptionKey(secret) {
  return createHash("sha256").update(secret).digest();
}

function encryptStore(store, secret) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(secret), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(store), "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

function decryptStore(value, secret) {
  const [version, iv, tag, ciphertext] = String(value).split(".");
  if (version !== "v1" || !iv || !tag || !ciphertext) throw new Error("Invalid encrypted ChatGPT store");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(secret), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8"));
}

function verifier() {
  return randomBytes(48).toString("base64url");
}

function challenge(value) {
  return createHash("sha256").update(value).digest("base64url");
}

function redirectUri() {
  return hostedConfig()?.redirectUri || `http://127.0.0.1:${Number(process.env.PORT) || 3001}/auth/chatgpt/callback`;
}

function appUrl(result) {
  const base = hostedConfig() ? process.env.PUBLIC_APP_URL : process.env.LOCAL_APP_URL;
  const destination = base || "http://127.0.0.1:5173/";
  const url = new URL(destination);
  url.searchParams.set("chatgpt", result);
  return url.href;
}

function publicError(message, status = 502) {
  const error = new Error(message);
  error.status = status;
  error.publicMessage = message;
  return error;
}

async function tokenRequest(parameters) {
  const body = new URLSearchParams(parameters);
  const headers = { "Content-Type": "application/x-www-form-urlencoded" };
  const secret = hostedConfig() && process.env.OPENAI_CHATGPT_CLIENT_SECRET;
  const method = process.env.OPENAI_CHATGPT_TOKEN_AUTH_METHOD || (secret ? "client_secret_post" : "none");
  if (secret && method === "client_secret_basic") headers.Authorization = `Basic ${Buffer.from(`${parameters.client_id}:${secret}`).toString("base64")}`;
  else if (secret && method === "client_secret_post") body.set("client_secret", secret);
  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers,
    body,
    signal: AbortSignal.timeout(30000),
  });
  const responseBody = await response.json().catch(() => ({}));
  if (!response.ok) throw publicError(responseBody.error_description || responseBody.error || "เชื่อมต่อบัญชี ChatGPT ไม่สำเร็จ", 401);
  return responseBody;
}

export async function startChatGPTSignIn() {
  if (!available()) throw publicError("การเชื่อมต่อ ChatGPT บนเว็บนี้ยังไม่ได้ตั้งค่า OAuth", 409);
  const store = await readStore();
  if (!store.hostId) store.hostId = `urn:uuid:${randomUUID()}`;
  if (!store.pending) store.pending = {};
  const state = verifier();
  const nonce = verifier();
  const codeVerifier = verifier();
  const clientId = hostedConfig()?.clientId || store.profile?.clientId || "dynamic_agent_client";
  const transaction = { state, nonce, codeVerifier, clientId, redirectUri: redirectUri(), createdAt: Date.now() };
  store.pending[state] = transaction;
  for (const [key, value] of Object.entries(store.pending)) if (Date.now() - value.createdAt > 10 * 60 * 1000) delete store.pending[key];
  await writeStore(store);

  const url = new URL(authorizationEndpoint);
  url.search = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: transaction.redirectUri,
    scope: scopes,
    resource,
    state,
    nonce,
    code_challenge_method: "S256",
    code_challenge: challenge(codeVerifier),
    ext_agent_host_id: store.hostId,
    ...(clientId === "dynamic_agent_client" ? { agent_name_hint: "Meal Picker For You" } : {}),
  }).toString();
  return url.href;
}

export async function finishChatGPTSignIn(query) {
  const state = typeof query?.state === "string" ? query.state : "";
  const store = await readStore();
  const transaction = store.pending?.[state];
  if (store.pending) delete store.pending[state];
  await writeStore(store);
  if (!transaction || Date.now() - transaction.createdAt > 10 * 60 * 1000) throw publicError("คำขอเชื่อมต่อหมดอายุ กรุณาเริ่มใหม่", 400);
  if (query.error) throw publicError("ยกเลิกการเชื่อมต่อ ChatGPT", 400);
  if (typeof query.code !== "string") throw publicError("ไม่ได้รับรหัสยืนยันจาก ChatGPT", 400);
  const returnedClientId = typeof query.client_id === "string" ? query.client_id : "";
  const clientId = transaction.clientId === "dynamic_agent_client" ? returnedClientId : transaction.clientId;
  if (!clientId || clientId === "dynamic_agent_client") throw publicError("การลงทะเบียน ChatGPT ไม่สมบูรณ์", 400);
  if (returnedClientId && transaction.clientId !== "dynamic_agent_client" && returnedClientId !== transaction.clientId) {
    throw publicError("บัญชี ChatGPT ไม่ตรงกับคำขอเดิม", 400);
  }

  const tokens = await tokenRequest({
    grant_type: "authorization_code",
    client_id: clientId,
    code: query.code,
    code_verifier: transaction.codeVerifier,
    redirect_uri: transaction.redirectUri,
    resource,
  });
  if (!tokens.id_token) throw publicError("ChatGPT ไม่ได้ส่งข้อมูลยืนยันตัวตนกลับมา", 401);
  const verified = await jwtVerify(tokens.id_token, jwks, { issuer, audience: clientId, requiredClaims: ["nonce"] });
  if (verified.payload.nonce !== transaction.nonce) throw publicError("การยืนยัน ChatGPT ไม่ตรงกับคำขอเดิม", 401);
  const grantedScopes = String(tokens.scope || "").split(/\s+/).filter(Boolean);
  if (!grantedScopes.includes("chatgpt.tokens.use.direct")) throw publicError("ยังไม่ได้อนุญาตให้แอปใช้แพ็กเกจ ChatGPT", 403);

  store.profile = {
    clientId,
    subject: verified.payload.sub,
    email: verified.payload.email || "",
    name: verified.payload.name || "",
    idToken: tokens.id_token,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    tokenType: tokens.token_type || "Bearer",
    scopes: grantedScopes,
    expiresAt: Date.now() + Number(tokens.expires_in || 3600) * 1000,
  };
  await writeStore(store);
  return appUrl("connected");
}

async function refreshedProfile(store) {
  const profile = store.profile;
  if (!profile?.refreshToken) throw publicError("กรุณาเชื่อมต่อบัญชี ChatGPT ใหม่", 401);
  if (profile.accessToken && profile.expiresAt > Date.now() + 60_000) return profile;
  const tokens = await tokenRequest({
    grant_type: "refresh_token",
    client_id: profile.clientId,
    refresh_token: profile.refreshToken,
    resource,
  });
  store.profile = {
    ...profile,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || profile.refreshToken,
    tokenType: tokens.token_type || profile.tokenType || "Bearer",
    scopes: tokens.scope ? String(tokens.scope).split(/\s+/).filter(Boolean) : profile.scopes,
    expiresAt: Date.now() + Number(tokens.expires_in || 3600) * 1000,
  };
  await writeStore(store);
  return store.profile;
}

export async function getChatGPTPlanProvider() {
  if (!available()) return null;
  const store = await readStore();
  if (!store.profile) return null;
  const profile = await refreshedProfile(store);
  if (!profile.scopes?.includes("chatgpt.tokens.use.direct")) return null;
  const response = await fetch("https://api.openai.com/v1/models", {
    headers: { "Authorization": `Bearer ${profile.accessToken}` },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw publicError("อ่านรายชื่อโมเดลจากบัญชี ChatGPT ไม่สำเร็จ กรุณาเชื่อมต่อใหม่", 502);
  const body = await response.json();
  const models = (body.models || body.data || []).filter((model) => model.visibility === "list" || model.visibility == null);
  const override = process.env.CHATGPT_RECIPE_MODEL;
  const selected = models.find((model) => model.slug === override || model.id === override) ||
    models.find((model) => /luna/i.test(model.slug || model.id || "")) || models[0];
  if (!selected) throw publicError("บัญชี ChatGPT นี้ไม่มีโมเดลที่พร้อมใช้งาน", 403);
  return { type: "chatgpt", token: profile.accessToken, model: selected.slug || selected.id };
}

export async function chatGPTStatus() {
  if (!available()) return { available: false, connected: false, hostedApprovalRequired: Boolean(process.env.VERCEL), apiKeyConfigured: Boolean(process.env.OPENAI_API_KEY) };
  const store = await readStore();
  const hosted = Boolean(hostedConfig());
  return {
    available: true,
    hosted,
    connected: Boolean(store.profile?.accessToken && store.profile?.scopes?.includes("chatgpt.tokens.use.direct")),
    ...(!hosted ? { email: store.profile?.email || "", name: store.profile?.name || "" } : {}),
    apiKeyConfigured: Boolean(process.env.OPENAI_API_KEY),
  };
}

export async function disconnectChatGPT() {
  if (!available()) return;
  const store = await readStore();
  const profile = store.profile;
  if (profile?.refreshToken) {
    try {
      const discovery = await (await fetch(discoveryEndpoint, { signal: AbortSignal.timeout(10000) })).json();
      if (discovery.revocation_endpoint) await fetch(discovery.revocation_endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: profile.refreshToken, token_type_hint: "refresh_token", client_id: profile.clientId }),
        signal: AbortSignal.timeout(15000),
      });
    } catch { /* Clear local credentials even if remote revocation is unavailable. */ }
  }
  store.profile = profile ? { clientId: profile.clientId, subject: profile.subject } : null;
  await writeStore(store);
}

export const chatGPTInternals = { available, appUrl, challenge };
