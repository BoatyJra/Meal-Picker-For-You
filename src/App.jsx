import { useEffect, useRef, useState } from "react";
import { Heart, Utensils, CakeSlice, CookingPot, Shuffle, Copy, Check, ChevronDown,
  Plus, ArrowUpRight, Users, ShoppingBasket, List, Search, X, LoaderCircle, LockKeyhole, Download, Pencil, Trash2, Save, SlidersHorizontal, Sparkles, LogIn, LogOut } from "lucide-react";
import { foodMenus, snackMenus, homeMenus } from "./menus.js";
import { validateRecipe, validateMenu, recipeText, tiktokVideoId } from "./recipe-schema.js";
import { menuArt, categoryArt, randomCategoryArt } from "./menu-art.js";
import MusicToggle from "./MusicToggle.jsx";

const modes = [
  { id: "food", label: "สั่งอาหาร", icon: Utensils, note: "มื้ออร่อย ส่งถึงเธอ", empty: "มื้อนี้ให้เราเลือกนะ" },
  { id: "snacks", label: "ของกินเล่น", icon: CakeSlice, note: "เติมความหวานอีกนิด", empty: "พักเติมความหวานกัน" },
  { id: "home", label: "ทำกินเอง", icon: CookingPot, note: "มื้อเล็ก ๆ สำหรับเราสองคน", empty: "วันนี้เข้าครัวกันไหม?" },
];
const messages = ["มื้อนี้เลือกให้แล้วนะ 💖", "อันนี้น่ากินมาก เธอลองมั้ย 💕", "พี่ว่าเมนูนี้เข้ากับวันนี้สุดๆ", "กินให้อร่อยนะคนเก่ง ✨", "มื้อนี้มีพี่คิดให้"];
const pick = (items) => items[Math.floor(Math.random() * items.length)];
const fallbackMenus = [...foodMenus.map((menu) => ({ ...menu, mode: "food" })), ...snackMenus.map((menu) => ({ ...menu, mode: "snacks" })), ...homeMenus.map((menu) => ({ ...menu, mode: "home" }))];

async function api(url, options = {}) {
  const response = await fetch(url, options);
  let body;
  try { body = await response.json(); } catch { throw new Error("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ลองอีกครั้งนะ"); }
  if (!response.ok) {
    const error = new Error(body.error || "เซิร์ฟเวอร์มีปัญหา ลองอีกครั้งนะ");
    error.status = response.status;
    throw error;
  }
  return body;
}

function RecipeDetails({ recipe }) {
  const [checked, setChecked] = useState([]);
  const [tab, setTab] = useState("ingredients");
  return <section className="recipe-section" aria-label={`สูตร ${recipe.name}`}>
    <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
      <h2 className="section-heading">เข้าครัวด้วยกัน</h2>
      <span className="small-label"><Users size={15} /> สำหรับ 2 คน</span>
    </div>
    <div className="recipe-tabs" role="group" aria-label="รายละเอียดสูตร">
      <button type="button" aria-pressed={tab === "ingredients"} onClick={() => setTab("ingredients")}><ShoppingBasket size={17} /> วัตถุดิบ</button>
      <button type="button" aria-pressed={tab === "steps"} onClick={() => setTab("steps")}><List size={17} /> วิธีทำ</button>
    </div>
    {tab === "ingredients" ? <>
      <p className="muted text-sm leading-6 my-4">ปริมาณสำหรับมื้อนี้ • วัตถุดิบพื้นฐานสำหรับซื้อที่ Makro แบ่งส่วนที่เหลือเก็บไว้</p>
      <ul className="ingredients">
        {recipe.ingredients.map((line, index) => <li key={index}>
          <label className={checked.includes(index) ? "ingredient checked" : "ingredient"}>
            <input type="checkbox" checked={checked.includes(index)} onChange={() => setChecked((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index])} />
            <span>{line}</span>
          </label>
        </li>)}
      </ul>
    </> : <ol className="steps">{recipe.steps.map((step, index) => <li key={index}><span className="step-number">{index + 1}</span><p>{step}</p></li>)}</ol>}
    {recipe.video && (tiktokVideoId(recipe.video) ? <div className="tiktok-video">
      <iframe src={`https://www.tiktok.com/player/v1/${tiktokVideoId(recipe.video)}?description=1&music_info=1&rel=0`} title={`วิดีโอวิธีทำ ${recipe.name} บน TikTok`} loading="lazy" allow="fullscreen; autoplay; encrypted-media; picture-in-picture" />
      <a className="video-link" href={recipe.video} target="_blank" rel="noopener noreferrer">เปิดวิดีโอนี้ใน TikTok <ArrowUpRight size={18} /></a>
    </div> : <a className="video-link" href={recipe.video} target="_blank" rel="noopener noreferrer">ค้นหา “{recipe.name} วิธีทำ” ใน TikTok <ArrowUpRight size={18} /></a>)}
  </section>;
}

function MenuForm({ initial, operation, onSave, onClose, busy }) {
  const removing = operation === "delete";
  const editing = operation === "edit";
  const [form, setForm] = useState({ name: initial.name || "", mode: initial.mode, category: initial.category || "comfort", video: initial.video || "", ingredients: (initial.ingredients || []).join("\n"), steps: (initial.steps || []).join("\n"), password: "" });
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [sources, setSources] = useState([]);
  const [chatGPT, setChatGPT] = useState({ loading: true });
  const [chatGPTBusy, setChatGPTBusy] = useState(false);
  const dialog = useRef(null);
  const nameInput = useRef(null);
  const splitLines = (value) => value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  useEffect(() => {
    const opener = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.showModal();
    nameInput.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; opener?.focus(); };
  }, []);
  useEffect(() => {
    let active = true;
    api("/api/chatgpt/status")
      .then((status) => { if (active) setChatGPT({ ...status, loading: false }); })
      .catch(() => { if (active) setChatGPT({ loading: false, available: false }); });
    return () => { active = false; };
  }, []);
  function field(name, value) { setForm((current) => ({ ...current, [name]: value })); if (name === "name") setSources([]); setError(""); }
  async function connectChatGPT() {
    setChatGPTBusy(true); setError("");
    try {
      const result = await api("/api/chatgpt/connect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: form.password }) });
      window.location.assign(result.url);
    } catch (cause) { setError(cause.message); setChatGPTBusy(false); }
  }
  async function disconnect() {
    setChatGPTBusy(true); setError("");
    try {
      await api("/api/chatgpt/disconnect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: form.password }) });
      setChatGPT((current) => ({ ...current, connected: false, email: "", name: "" }));
    } catch (cause) { setError(cause.message); }
    finally { setChatGPTBusy(false); }
  }
  async function generate() {
    const name = form.name.trim();
    if (!name) { setError("กรอกชื่อเมนูก่อนสร้างสูตร"); return; }
    setGenerating(true); setError(""); setSources([]);
    try {
      const result = await api("/api/generate-recipe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, password: form.password }) });
      if (!result?.recipe || validateMenu(result.recipe)) throw new Error("สูตรที่สร้างมายังไม่สมบูรณ์ ลองใหม่อีกครั้งนะ");
      setForm((current) => ({ ...current, mode: "home", name: result.recipe.name, category: result.recipe.category,
        video: result.recipe.video, ingredients: result.recipe.ingredients.join("\n"), steps: result.recipe.steps.join("\n") }));
      setSources(Array.isArray(result.sources) ? result.sources : []);
    } catch (cause) { setError(cause.message); }
    finally { setGenerating(false); }
  }
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const recipe = { id: initial.id, mode: form.mode, name: form.name.trim(), video: form.video.trim(), category: form.category.trim(), ingredients: splitLines(form.ingredients), steps: splitLines(form.steps) };
    const invalid = removing ? null : validateMenu(recipe);
    if (invalid) { setError(invalid); return; }
    try { await onSave(recipe, form.password); } catch (cause) { setError(cause.message); }
  }
  return <dialog className="recipe-dialog" aria-labelledby="recipe-form-title" ref={dialog} onCancel={(event) => { if (busy) event.preventDefault(); }} onClose={onClose}>
    <div className="dialog-heading"><div><p className="eyebrow">OUR LITTLE MENU BOOK</p><h2 id="recipe-form-title">{removing ? "ลบเมนูนี้ไหม?" : editing ? "แก้ไขเมนูของเรา" : "เก็บเมนูอร่อยไว้ด้วยกัน"}</h2></div><button className="icon-button" type="button" aria-label="ปิดแบบฟอร์ม" title="ปิด" disabled={busy} onClick={() => dialog.current.close()}><X size={20} /></button></div>
    <form onSubmit={submit} className="recipe-form">
      {removing ? <p className="delete-summary">{initial.name}</p> : <>
      <label>ชื่อเมนู<input ref={nameInput} required maxLength={100} value={form.name} onChange={(event) => field("name", event.target.value)} placeholder="เช่น ข้าวไก่อบของเรา" /></label>
      <div className="form-columns"><label>หมวดเมนู<select value={form.mode} onChange={(event) => field("mode", event.target.value)}>{modes.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label>แท็ก<input required maxLength={40} value={form.category} onChange={(event) => field("category", event.target.value)} placeholder="comfort, เส้น, เค้ก" /></label></div>
      {form.mode === "home" && <>
      <label>ลิงก์ TikTok <span className="muted font-normal">(ไม่บังคับ)</span><input type="url" maxLength={2000} value={form.video} onChange={(event) => field("video", event.target.value)} placeholder="https://www.tiktok.com/@.../video/..." /></label>
      <label>วัตถุดิบสำหรับ 2 คน<textarea required maxLength={10000} rows={4} value={form.ingredients} onChange={(event) => field("ingredients", event.target.value)} placeholder={"ไก่ 300 กรัม\nข้าวสาร 150 กรัม"} /><span className="field-note">หนึ่งวัตถุดิบพร้อมปริมาณ ต่อหนึ่งบรรทัด</span></label>
      <label>วิธีทำ<textarea required maxLength={20000} rows={4} value={form.steps} onChange={(event) => field("steps", event.target.value)} placeholder={"หั่นไก่และเตรียมเครื่องปรุง\nผัดไก่จนสุกทั่ว"} /><span className="field-note">หนึ่งขั้นตอน ต่อหนึ่งบรรทัด</span></label>
      </>}
      </>}
      <label><span className="flex items-center gap-2"><LockKeyhole size={15} /> รหัสผ่านเจ้าของสูตร <span className="muted font-normal">(ครั้งแรกหรือเมื่อครบ 8 ชม.)</span></span><input type="password" autoComplete="current-password" value={form.password} onChange={(event) => field("password", event.target.value)} /></label>
      {form.mode === "home" && !chatGPT.loading && <div className="chatgpt-connect" aria-live="polite">
        {chatGPT.connected ? <><div><strong><Check size={16} /> ใช้แพ็กเกจ ChatGPT แล้ว</strong><span>{chatGPT.name || chatGPT.email || "เชื่อมต่อสำเร็จ"}</span></div><button type="button" disabled={chatGPTBusy || busy || generating} onClick={disconnect}>{chatGPTBusy ? <LoaderCircle className="spin" size={16} /> : <LogOut size={16} />} ยกเลิกการเชื่อมต่อ</button></>
          : chatGPT.available ? <><div><strong>สร้างสูตรด้วยแพ็กเกจ ChatGPT</strong><span>เชื่อมต่อครั้งเดียว แล้วใช้สิทธิ์จากแผนของคุณ</span></div><button type="button" disabled={chatGPTBusy || busy || generating} onClick={connectChatGPT}>{chatGPTBusy ? <LoaderCircle className="spin" size={16} /> : <LogIn size={16} />} Continue with ChatGPT</button></>
            : chatGPT.hostedApprovalRequired ? <div><strong>ChatGPT Plus บน Vercel ยังรอสิทธิ์ OAuth</strong><span>{chatGPT.apiKeyConfigured ? "ตอนนี้ระบบจะใช้ OpenAI API key แทน" : "ตั้ง OpenAI API key ชั่วคราว หรือขอ Hosted OAuth client จาก OpenAI"}</span></div>
              : <div><strong>ChatGPT Plus ไม่พร้อมใช้งาน</strong><span>{chatGPT.apiKeyConfigured ? "ตอนนี้ระบบจะใช้ OpenAI API key แทน" : "เปิด SIWC สำหรับเซิร์ฟเวอร์ local หรือตั้ง OpenAI API key"}</span></div>}
      </div>}
      {form.mode === "home" && <button className="ai-generate" type="button" disabled={busy || generating} onClick={generate}>{generating ? <LoaderCircle className="spin" size={18} /> : <Sparkles size={18} />} {generating ? "กำลังค้นหาและสร้างสูตร…" : "สร้างสูตรด้วย AI"}</button>}
      {sources.length > 0 && <div className="ai-sources"><span>แหล่งข้อมูลที่ AI ใช้</span><ul>{sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a></li>)}</ul></div>}
      {error && <p className="error-message" role="alert">{error}</p>}
      <button className={`button-primary ${removing ? "danger-button" : ""}`} type="submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={18} /> : removing ? <Trash2 size={18} /> : <Save size={18} />} {busy ? "กำลังบันทึก…" : removing ? "ยืนยันลบเมนู" : "บันทึกเมนู"}</button>
    </form>
  </dialog>;
}

function FavoriteForm({ menu, favorite, onSave, onClose, busy }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const dialog = useRef(null);
  const passwordInput = useRef(null);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.showModal();
    passwordInput.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);
  async function submit(event) {
    event.preventDefault(); setError("");
    try { await onSave(password); }
    catch (cause) { setError(cause.message); }
  }
  return <dialog className="recipe-dialog favorite-dialog" aria-labelledby="favorite-form-title" ref={dialog} onClose={onClose}>
    <div className="dialog-heading"><div><p className="eyebrow">OUR FAVORITE TABLE</p><h2 id="favorite-form-title">{favorite ? "เก็บเมนูนี้ไว้ในใจ" : "เอาออกจากเมนูโปรด"}</h2></div><button className="icon-button" type="button" aria-label="ปิด" disabled={busy} onClick={() => dialog.current.close()}><X size={20} /></button></div>
    <form className="recipe-form" onSubmit={submit}>
      <p className="favorite-summary"><Heart size={18} fill="currentColor" /> {menu.name}</p>
      <label><span className="flex items-center gap-2"><LockKeyhole size={15} /> รหัสผ่านเจ้าของสูตร</span><input ref={passwordInput} type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      {error && <p className="error-message" role="alert">{error}</p>}
      <button className="button-primary" type="submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={18} /> : <Heart size={18} fill="currentColor" />} {busy ? "กำลังบันทึก…" : favorite ? "เพิ่มเป็นเมนูโปรด" : "นำออกจากเมนูโปรด"}</button>
    </form>
  </dialog>;
}

export default function App() {
  const [mode, setMode] = useState("food");
  const [recipes, setRecipes] = useState([]);
  const [loadState, setLoadState] = useState("loading");
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0);
  const [artwork, setArtwork] = useState("rice");
  const [rolling, setRolling] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState(null);
  const [tag, setTag] = useState("");
  const [busy, setBusy] = useState(false);
  const [copyState, setCopyState] = useState("");
  const [notice, setNotice] = useState("");
  const [legacyRecipes, setLegacyRecipes] = useState([]);
  const [favoritePrompt, setFavoritePrompt] = useState(null);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const generation = useRef(0);
  const loadGeneration = useRef(0);
  const rollTimer = useRef(null);
  const libraryList = useRef(null);
  const active = modes.find((item) => item.id === mode);
  const home = mode === "home";
  const menus = (loadState === "error" ? fallbackMenus : recipes).filter((menu) => menu.mode === mode);
  const tags = [...new Set(menus.map((menu) => menu.category))].sort();
  const pool = menus.filter((menu) => !tag || menu.category === tag);
  const filtered = pool.filter((menu) => `${menu.name} ${menu.category}`.toLocaleLowerCase().includes(query.toLocaleLowerCase().trim()));

  async function loadRecipes() {
    const request = ++loadGeneration.current;
    setLoadState("loading");
    try {
      const result = await api("/api/menus");
      if (!Array.isArray(result) || result.some((recipe) => validateMenu(recipe))) throw new Error("Invalid response");
      if (request === loadGeneration.current) { setRecipes(result); setLoadState("ready"); }
    } catch { if (request === loadGeneration.current) setLoadState("error"); }
  }
  useEffect(() => {
    loadRecipes();
    const params = new URLSearchParams(window.location.search);
    const result = params.get("chatgpt");
    if (result) {
      setNotice(result === "connected" ? "เชื่อมต่อ ChatGPT สำเร็จแล้ว" : "เชื่อมต่อ ChatGPT ไม่สำเร็จ ลองอีกครั้งนะ");
      if (result === "connected") {
        setMode("home");
        setEditor({ operation: "add", menu: { mode: "home", category: "ทำกินเอง" } });
      }
      params.delete("chatgpt");
      const query = params.toString();
      window.history.replaceState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
    }
    try {
      const old = JSON.parse(localStorage.getItem("meal-picker-home-recipes-v1") || "[]");
      if (Array.isArray(old)) setLegacyRecipes(old.filter((recipe) => !validateRecipe(recipe)));
    } catch { /* Existing browser data stays untouched. */ }
  }, []);
  useEffect(() => () => clearTimeout(rollTimer.current), []);
  useEffect(() => {
    const timer = setTimeout(() => {
      categoryArt[mode].forEach((art) => { const image = new Image(); image.src = `/menu-${art}.webp`; });
    }, 600);
    return () => clearTimeout(timer);
  }, [mode]);
  useEffect(() => {
    const list = libraryList.current;
    const row = list?.querySelector(".is-selected");
    if (listOpen && row) {
      list.scrollTo({ top: row.offsetTop - (list.clientHeight - row.offsetHeight) / 2,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    }
  }, [listOpen, selected?.id]);
  useEffect(() => { if (libraryList.current) libraryList.current.scrollTop = 0; }, [mode, query, tag]);

  function changeMode(value) {
    clearTimeout(rollTimer.current); setRolling(false);
    generation.current += 1;
    setArtwork(randomCategoryArt(value));
    setRevision((value) => value + 1);
    setMode(value); setSelected(null); setCopyState(""); setMessage(""); setQuery(""); setTag(""); setNotice("");
  }
  function choose(menu) {
    clearTimeout(rollTimer.current); setRolling(false);
    generation.current += 1;
    setArtwork((last) => randomCategoryArt(menu.mode || mode, last));
    setSelected(menu); setMessage(pick(messages)); setRevision((value) => value + 1); setCopyState("");
  }
  function changeTag(value) {
    clearTimeout(rollTimer.current); setRolling(false); generation.current += 1;
    setTag(value); setSelected(null); setMessage(""); setCopyState("");
  }
  function randomize() {
    if (rolling) return;
    const choices = pool.filter((menu) => menu.id ? menu.id !== selected?.id : menu.name !== selected?.name);
    const next = choices.length ? pick(choices) : pool[0];
    if (!next) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { choose(next); return; }
    setRolling(true);
    rollTimer.current = setTimeout(() => choose(next), 440);
  }
  async function copy() {
    const current = generation.current;
    try {
      await navigator.clipboard.writeText(home ? recipeText(selected) : selected.name);
      if (current === generation.current) setCopyState("คัดลอกแล้ว");
    } catch { if (current === generation.current) setCopyState("คัดลอกไม่ได้ ลองอีกครั้ง"); }
  }
  async function saveRecipe(recipe, password) {
    setBusy(true);
    try {
      const removing = editor.operation === "delete";
      const saved = await api("/api/menus", { method: removing ? "DELETE" : editor.operation === "edit" ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(removing ? { id: recipe.id, password } : { ...recipe, password }) });
      setRecipes((current) => removing ? current.filter((item) => item.id !== recipe.id) : editor.operation === "edit" ? current.map((item) => item.id === saved.id ? saved : item) : [...current, saved]);
      setEditor(null);
      if (removing) { if (selected?.id === recipe.id) { generation.current += 1; setSelected(null); setMessage(""); setCopyState(""); } }
      else { changeMode(saved.mode); choose(saved); }
      setTag(""); setNotice(removing ? "ลบเมนูแล้ว" : "บันทึกเมนูแล้ว");
    } finally { setBusy(false); }
  }
  function applyFavorite(menuId, favorite) {
    setRecipes((current) => current.map((menu) => menu.id === menuId ? { ...menu, favorite } : menu));
    setSelected((current) => current?.id === menuId ? { ...current, favorite } : current);
    setNotice(favorite ? "เพิ่มในเมนูโปรดแล้ว" : "นำออกจากเมนูโปรดแล้ว");
  }
  async function saveFavorite(menu, favorite, password = "") {
    setFavoriteBusy(true);
    try {
      const result = await api("/api/favorites", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ menuId: menu.id, favorite, password }) });
      applyFavorite(result.menuId, result.favorite);
    } finally { setFavoriteBusy(false); }
  }
  async function toggleFavorite(menu) {
    const favorite = !menu.favorite;
    try { await saveFavorite(menu, favorite); }
    catch (cause) {
      if (cause.status === 401) { setFavoritePrompt({ menu, favorite }); setNotice(""); }
      else setNotice(cause.message);
    }
  }
  function exportLegacy() {
    const blob = new Blob([JSON.stringify(legacyRecipes, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = "my-saved-recipes.json"; link.click();
    URL.revokeObjectURL(url);
  }

  return <div className="app-shell">
    <a className="skip-link" href="#main-content">ข้ามไปเลือกเมนู</a>
    <div className="tartan-backdrop" aria-hidden="true" />
    <header className="site-header"><a className="brand" href="#" aria-label="Meal Picker for you หน้าแรก"><span className="brand-mark"><Heart size={18} fill="currentColor" /></span><span>Meal Picker <em>for you</em></span></a><div className="header-note" aria-hidden="true">OUR DAILY TABLE · 2026</div><div className="header-controls"><MusicToggle /></div></header>
    <main className="main-content" id="main-content">
      <div className="intro"><span className="intro-index" aria-hidden="true">01 / PICK A MOOD</span><p className="eyebrow"><Heart size={12} fill="currentColor" /> A LITTLE LESS THINKING, A LITTLE MORE US</p><h1>วันนี้<br/><span>กินอะไรดี?</span></h1><p className="muted">ไม่ต้องคิดเยอะ เดี๋ยวโต๊ะนี้เลือกให้เอง</p><span className="intro-note" aria-hidden="true">สุ่มด้วยใจ<br/>เสิร์ฟด้วยรัก</span></div>
      <div className="mode-tabs" role="group" aria-label="เลือกหมวดเมนู">{modes.map(({ id, label, icon: Icon }) => <button type="button" key={id} aria-pressed={mode === id} onClick={() => changeMode(id)}><Icon size={18} /><span>{label}</span></button>)}</div>
      <div className="mode-meta"><span>{active.note}</span><span>{menus.length} เมนู{home && " · 2 คน"}</span></div>
      <div className="filter-bar"><SlidersHorizontal size={16} /><select aria-label="เลือกแท็กสำหรับสุ่ม" value={tag} onChange={(event) => changeTag(event.target.value)}><option value="">ทุกแท็ก</option>{tags.map((value) => <option key={value} value={value}>{value}</option>)}</select>{tag && <span>{pool.length} เมนู</span>}</div>
      <section className={`picker-result ${home ? "home-result" : mode === "snacks" ? "snack-result" : ""} ${rolling ? "is-rolling" : ""}`} aria-live="polite" aria-busy={rolling}>
        <div key={revision} className="result-content">
          <div className="result-topline"><span className="result-kicker">{selected ? "เมนูนี้… เลือกให้เธอ" : home ? "เข้าครัวด้วยกัน" : mode === "snacks" ? "เวลาของความหวาน" : "มื้ออร่อยของเรา"}</span>{selected?.id ? <button className={`favorite-button ${selected.favorite ? "is-favorite" : ""}`} type="button" aria-label={selected.favorite ? `นำ ${selected.name} ออกจากเมนูโปรด` : `เพิ่ม ${selected.name} เป็นเมนูโปรด`} aria-pressed={Boolean(selected.favorite)} disabled={favoriteBusy} onClick={() => toggleFavorite(selected)}><Heart size={19} fill={selected.favorite ? "currentColor" : "none"} /></button> : <Heart size={18} fill="currentColor" aria-hidden="true" />}</div>
          <div className="result-art" aria-hidden="true"><img src={`/menu-${artwork}.webp`} alt="" width="180" height="150" /></div>
          <span className="tag">{selected?.category || (home ? "สำหรับเราสองคน" : mode === "snacks" ? "a little sweet treat" : "a little comfort food")}</span>
          <h2>{selected?.name || (loadState === "ready" && !pool.length ? "เพิ่มเมนูแรกของเรากัน" : active.empty)}</h2>
          <p className="result-message">{message || "วันนี้ไม่ต้องคิดเยอะ เดี๋ยวเลือกให้เอง"}</p>
          {home && <span className="result-servings"><Users size={14} /> สำหรับเราสองคน</span>}
        </div>
      </section>
      <div className="result-actions"><button className={`button-primary ${rolling ? "shuffle-active" : ""}`} type="button" aria-busy={rolling} disabled={!pool.length || loadState === "loading" || rolling} onClick={randomize}>{loadState === "loading" ? <LoaderCircle className="spin" size={20} /> : rolling ? <LoaderCircle className="rolling-loader" size={20} /> : <Shuffle size={20} />} {rolling ? "กำลังสุ่ม…" : "สุ่มเมนูให้เธอ"}</button><button className="icon-button copy-button" type="button" title={home ? "คัดลอกสูตรและวัตถุดิบ" : "คัดลอกเมนู"} aria-label={home ? "คัดลอกสูตรและวัตถุดิบ" : "คัดลอกเมนู"} disabled={!selected || rolling} onClick={copy}>{copyState === "คัดลอกแล้ว" ? <Check size={20} /> : <Copy size={20} />}</button></div>
      <p className="feedback" role="status">{copyState || notice}</p>
      {loadState === "error" && <div className="error-message" role="alert">เชื่อมต่อลิสต์ที่บันทึกไว้ไม่ได้ กำลังแสดงเมนูเริ่มต้น <button type="button" onClick={loadRecipes}>ลองอีกครั้ง</button></div>}
      <div className="library-bar"><button className="library-toggle" type="button" aria-expanded={listOpen} aria-controls="menu-library" onClick={() => setListOpen((value) => !value)}><List size={18} /> {listOpen ? "ซ่อนลิสต์เมนู" : "ดูลิสต์เมนู"}<span className="library-count">{menus.length}</span><ChevronDown size={17} className={listOpen ? "chevron-open" : ""} /></button><button className="add-recipe" type="button" disabled={loadState !== "ready"} onClick={() => setEditor({ operation: "add", menu: { mode, category: home ? "ทำกินเอง" : mode === "snacks" ? "ของหวาน" : "comfort" } })}><Plus size={17} /> เพิ่มเมนู</button></div>
      <section id="menu-library" className={`library-reveal ${listOpen ? "is-open" : ""}`} aria-label="รายการเมนู" aria-hidden={!listOpen} inert={!listOpen}>
        <div className="library-clip"><div className="menu-library">
          <div className="library-heading"><h2>เมนูของเรา</h2><span>{filtered.length} / {menus.length} เมนู</span></div>
          <label className="search-field"><Search size={18} /><input type="search" aria-label="ค้นหาเมนู" placeholder="ค้นหาเมนูที่ชอบ…" value={query} onChange={(event) => setQuery(event.target.value)} />{query && <button className="clear-search" type="button" aria-label="ล้างคำค้นหา" title="ล้างคำค้นหา" onClick={() => setQuery("")}><X size={16} /></button>}</label>
          <ul ref={libraryList}>{filtered.map((menu, index) => <li className={selected?.id === menu.id && menu.id ? "is-selected" : ""} style={{ "--row-delay": `${Math.min(index, 7) * 22}ms` }} key={menu.id || menu.name}>
            <button className="menu-name" type="button" aria-pressed={selected?.id === menu.id && Boolean(menu.id)} onClick={() => choose(menu)}><img className="menu-thumb" src={`/menu-${menuArt(menu, mode)}.webp`} alt="" width="48" height="48" loading="lazy" /><div><strong>{menu.name}</strong><span>{menu.category}{home ? " · 2 คน" : ""}</span></div>{selected?.id === menu.id && menu.id && <Check className="selected-mark" size={16} />}</button>
            <div className="row-actions"><button className="icon-button" type="button" title="แก้ไขเมนู" aria-label={`แก้ไข ${menu.name}`} disabled={!menu.id} onClick={() => setEditor({ operation: "edit", menu })}><Pencil size={16} /></button><button className="icon-button delete-icon" type="button" title="ลบเมนู" aria-label={`ลบ ${menu.name}`} disabled={!menu.id} onClick={() => setEditor({ operation: "delete", menu })}><Trash2 size={16} /></button></div>
          </li>)}</ul>
          {!filtered.length && <div className="library-empty"><Search size={24} /><p>{loadState === "loading" ? "กำลังโหลดเมนู…" : "ไม่พบเมนูที่ค้นหา"}</p>{loadState !== "loading" && (query || tag) && <button type="button" onClick={() => { setQuery(""); changeTag(""); }}>ล้างตัวกรอง</button>}</div>}
        </div></div>
      </section>
      {home && selected && <RecipeDetails key={`${selected.name}-${revision}`} recipe={selected} />}
      {home && legacyRecipes.length > 0 && <div className="legacy-notice"><p>พบ {legacyRecipes.length} สูตรที่เคยเก็บในเบราว์เซอร์นี้</p><button type="button" onClick={exportLegacy}><Download size={16} /> ดาวน์โหลดสูตรเดิม</button></div>}
      <footer className="app-footer"><Heart size={14} /> {home ? "มื้อธรรมดา ที่พิเศษเพราะกินด้วยกัน" : "กินให้อร่อยนะคนเก่ง"}</footer>
    </main>
    {editor && <MenuForm initial={editor.menu} operation={editor.operation} onSave={saveRecipe} onClose={() => setEditor(null)} busy={busy} />}
    {favoritePrompt && <FavoriteForm menu={favoritePrompt.menu} favorite={favoritePrompt.favorite} busy={favoriteBusy} onClose={() => setFavoritePrompt(null)} onSave={async (password) => { await saveFavorite(favoritePrompt.menu, favoritePrompt.favorite, password); setFavoritePrompt(null); }} />}
  </div>;
}
