import { useEffect, useRef, useState } from "react";
import { Heart, Utensils, CakeSlice, CookingPot, Shuffle, Copy, Check, ChevronDown, ChevronUp,
  Plus, ArrowUpRight, Users, ShoppingBasket, List, Search, X, LoaderCircle, LockKeyhole, Download, Pencil, Trash2, Save, SlidersHorizontal } from "lucide-react";
import { foodMenus, snackMenus, homeMenus } from "./menus.js";
import { validateRecipe, validateMenu, recipeText } from "./recipe-schema.js";
import { menuArt } from "./menu-art.js";

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
  if (!response.ok) throw new Error(body.error || "เซิร์ฟเวอร์มีปัญหา ลองอีกครั้งนะ");
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
    {recipe.video && <a className="video-link" href={recipe.video} target="_blank" rel="noopener noreferrer">ดูสูตรต้นฉบับบน TikTok <ArrowUpRight size={18} /></a>}
  </section>;
}

function MenuForm({ initial, operation, onSave, onClose, busy }) {
  const removing = operation === "delete";
  const editing = operation === "edit";
  const [form, setForm] = useState({ name: initial.name || "", mode: initial.mode, category: initial.category || "comfort", video: initial.video || "", ingredients: (initial.ingredients || []).join("\n"), steps: (initial.steps || []).join("\n"), password: "" });
  const [error, setError] = useState("");
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
  function field(name, value) { setForm((current) => ({ ...current, [name]: value })); setError(""); }
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
      <label><span className="flex items-center gap-2"><LockKeyhole size={15} /> รหัสผ่านเจ้าของสูตร</span><input type="password" required autoComplete="current-password" value={form.password} onChange={(event) => field("password", event.target.value)} /></label>
      {error && <p className="error-message" role="alert">{error}</p>}
      <button className={`button-primary ${removing ? "danger-button" : ""}`} type="submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={18} /> : removing ? <Trash2 size={18} /> : <Save size={18} />} {busy ? "กำลังบันทึก…" : removing ? "ยืนยันลบเมนู" : "บันทึกเมนู"}</button>
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
  const [listOpen, setListOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState(null);
  const [tag, setTag] = useState("");
  const [busy, setBusy] = useState(false);
  const [copyState, setCopyState] = useState("");
  const [notice, setNotice] = useState("");
  const [legacyRecipes, setLegacyRecipes] = useState([]);
  const generation = useRef(0);
  const loadGeneration = useRef(0);
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
    try {
      const old = JSON.parse(localStorage.getItem("meal-picker-home-recipes-v1") || "[]");
      if (Array.isArray(old)) setLegacyRecipes(old.filter((recipe) => !validateRecipe(recipe)));
    } catch { /* Existing browser data stays untouched. */ }
  }, []);

  function changeMode(value) {
    generation.current += 1;
    setMode(value); setSelected(null); setCopyState(""); setMessage(""); setQuery(""); setTag(""); setNotice("");
  }
  function choose(menu) {
    generation.current += 1;
    setSelected(menu); setMessage(pick(messages)); setRevision((value) => value + 1); setCopyState("");
  }
  function randomize() {
    const choices = pool.filter((menu) => menu.id ? menu.id !== selected?.id : menu.name !== selected?.name);
    if (choices.length) choose(pick(choices));
    else if (pool.length) choose(pool[0]);
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
  function exportLegacy() {
    const blob = new Blob([JSON.stringify(legacyRecipes, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = "my-saved-recipes.json"; link.click();
    URL.revokeObjectURL(url);
  }

  return <div className="app-shell">
    <header className="site-header"><a className="brand" href="#"><Heart size={20} fill="currentColor" /> Meal Picker <span className="brand-sub">for you</span></a><span className="small-label"><Heart size={13} /> made with love</span></header>
    <main className="main-content">
      <div className="intro"><p className="eyebrow"><Heart size={12} fill="currentColor" /> A LITTLE LESS THINKING, A LITTLE MORE US</p><h1>วันนี้กินอะไรดี?</h1><p className="muted">มาสุ่มกันนนน</p></div>
      <div className="mode-tabs" role="group" aria-label="เลือกหมวดเมนู">{modes.map(({ id, label, icon: Icon }) => <button type="button" key={id} aria-pressed={mode === id} onClick={() => changeMode(id)}><Icon size={18} /><span>{label}</span></button>)}</div>
      <div className="mode-meta"><span>{active.note}</span><span>{menus.length} เมนู{home && " · 2 คน"}</span></div>
      <div className="filter-bar"><SlidersHorizontal size={16} /><select aria-label="เลือกแท็กสำหรับสุ่ม" value={tag} onChange={(event) => { generation.current += 1; setTag(event.target.value); setSelected(null); setMessage(""); setCopyState(""); }}><option value="">ทุกแท็ก</option>{tags.map((value) => <option key={value} value={value}>{value}</option>)}</select>{tag && <span>{pool.length} เมนู</span>}</div>
      <section className={`picker-result ${home ? "home-result" : mode === "snacks" ? "snack-result" : ""}`} aria-live="polite">
        <div key={revision} className="result-content">
          <div className="result-topline"><span className="result-kicker">{selected ? "เมนูนี้… เลือกให้เธอ" : home ? "เข้าครัวด้วยกัน" : mode === "snacks" ? "เวลาของความหวาน" : "มื้ออร่อยของเรา"}</span><Heart size={18} fill="currentColor" aria-hidden="true" /></div>
          <div className="result-art" aria-hidden="true"><img src={`/menu-${menuArt(selected, mode)}.webp`} alt="" width="180" height="150" /></div>
          <span className="tag">{selected?.category || (home ? "สำหรับเราสองคน" : mode === "snacks" ? "a little sweet treat" : "a little comfort food")}</span>
          <h2>{selected?.name || (loadState === "ready" && !pool.length ? "เพิ่มเมนูแรกของเรากัน" : active.empty)}</h2>
          <p className="result-message">{message || "วันนี้ไม่ต้องคิดเยอะ เดี๋ยวเลือกให้เอง"}</p>
          {home && <span className="result-servings"><Users size={14} /> สำหรับเราสองคน</span>}
        </div>
      </section>
      <div className="result-actions"><button className="button-primary" type="button" disabled={!pool.length || loadState === "loading"} onClick={randomize}>{loadState === "loading" ? <LoaderCircle className="spin" size={20} /> : <Shuffle size={20} />} สุ่มเมนูให้เธอ</button><button className="icon-button copy-button" type="button" title={home ? "คัดลอกสูตรและวัตถุดิบ" : "คัดลอกเมนู"} aria-label={home ? "คัดลอกสูตรและวัตถุดิบ" : "คัดลอกเมนู"} disabled={!selected} onClick={copy}>{copyState === "คัดลอกแล้ว" ? <Check size={20} /> : <Copy size={20} />}</button></div>
      <p className="feedback" role="status">{copyState || notice}</p>
      {loadState === "error" && <div className="error-message" role="alert">เชื่อมต่อลิสต์ที่บันทึกไว้ไม่ได้ กำลังแสดงเมนูเริ่มต้น <button type="button" onClick={loadRecipes}>ลองอีกครั้ง</button></div>}
      {home && selected && <RecipeDetails key={`${selected.name}-${revision}`} recipe={selected} />}
      <div className="library-bar"><button className="library-toggle" type="button" aria-expanded={listOpen} aria-controls="menu-library" onClick={() => setListOpen((value) => !value)}><List size={18} /> {listOpen ? "ซ่อนลิสต์เมนู" : "ดูลิสต์เมนู"} {listOpen ? <ChevronUp size={17} /> : <ChevronDown size={17} />}</button><button className="add-recipe" type="button" disabled={loadState !== "ready"} onClick={() => setEditor({ operation: "add", menu: { mode, category: home ? "ทำกินเอง" : mode === "snacks" ? "ของหวาน" : "comfort" } })}><Plus size={17} /> เพิ่มเมนู</button></div>
      {listOpen && <section id="menu-library" className="menu-library" aria-label="รายการเมนู"><label className="search-field"><Search size={18} /><input type="search" aria-label="ค้นหาเมนู" placeholder="ค้นหาเมนูที่ชอบ…" value={query} onChange={(event) => setQuery(event.target.value)} /></label><ul>{filtered.map((menu) => <li key={menu.id || menu.name}><button className="menu-name" type="button" onClick={() => choose(menu)}><strong>{menu.name}</strong><span>{menu.category}{home ? " · 2 คน" : ""}</span></button><div className="row-actions"><button className="icon-button" type="button" title="แก้ไขเมนู" aria-label={`แก้ไข ${menu.name}`} disabled={!menu.id} onClick={() => setEditor({ operation: "edit", menu })}><Pencil size={16} /></button><button className="icon-button delete-icon" type="button" title="ลบเมนู" aria-label={`ลบ ${menu.name}`} disabled={!menu.id} onClick={() => setEditor({ operation: "delete", menu })}><Trash2 size={16} /></button></div></li>)}</ul>{!filtered.length && <p className="muted text-center py-6">{loadState === "loading" ? "กำลังโหลดเมนู…" : "ไม่พบเมนูที่ค้นหา"}</p>}</section>}
      {home && legacyRecipes.length > 0 && <div className="legacy-notice"><p>พบ {legacyRecipes.length} สูตรที่เคยเก็บในเบราว์เซอร์นี้</p><button type="button" onClick={exportLegacy}><Download size={16} /> ดาวน์โหลดสูตรเดิม</button></div>}
      <footer className="app-footer"><Heart size={14} /> {home ? "มื้อธรรมดา ที่พิเศษเพราะกินด้วยกัน" : "กินให้อร่อยนะคนเก่ง"}</footer>
    </main>
    {editor && <MenuForm initial={editor.menu} operation={editor.operation} onSave={saveRecipe} onClose={() => setEditor(null)} busy={busy} />}
  </div>;
}
