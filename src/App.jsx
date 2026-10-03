import { useEffect, useRef, useState } from "react";
import { Heart, Utensils, CakeSlice, CookingPot, Shuffle, Copy, Check, ChevronDown, ChevronUp,
  Plus, ArrowUpRight, Users, ShoppingBasket, List, Search, X, LoaderCircle, LockKeyhole, Download } from "lucide-react";
import { foodMenus, snackMenus, homeMenus } from "./menus.js";
import { validateRecipe, recipeText } from "./recipe-schema.js";

const modes = [
  { id: "food", label: "สั่งอาหาร", icon: Utensils, note: "มื้ออร่อย ส่งถึงเธอ", empty: "มื้อนี้ให้เราเลือกนะ" },
  { id: "snacks", label: "ของกินเล่น", icon: CakeSlice, note: "เติมความหวานอีกนิด", empty: "พักเติมความหวานกัน" },
  { id: "home", label: "ทำกินเอง", icon: CookingPot, note: "มื้อเล็ก ๆ สำหรับเราสองคน", empty: "วันนี้เข้าครัวกันไหม?" },
];
const messages = ["มื้อนี้เลือกให้แล้วนะ 💖", "อันนี้น่ากินมาก เธอลองมั้ย 💕", "พี่ว่าเมนูนี้เข้ากับวันนี้สุดๆ", "กินให้อร่อยนะคนเก่ง ✨", "มื้อนี้มีพี่คิดให้"];
const pick = (items) => items[Math.floor(Math.random() * items.length)];

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

function RecipeForm({ onSave, busy }) {
  const [form, setForm] = useState({ name: "", video: "", ingredients: "", steps: "", password: "" });
  const [error, setError] = useState("");
  const dialog = useRef(null);
  const nameInput = useRef(null);
  const splitLines = (value) => value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.showModal();
    nameInput.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);
  function field(name, value) { setForm((current) => ({ ...current, [name]: value })); setError(""); }
  async function submit(event) {
    event.preventDefault();
    const recipe = { name: form.name.trim(), video: form.video.trim(), category: "สูตรของเรา", ingredients: splitLines(form.ingredients), steps: splitLines(form.steps) };
    const invalid = validateRecipe(recipe);
    if (invalid) { setError(invalid); return; }
    try { await onSave(recipe, form.password); } catch (cause) { setError(cause.message); }
  }
  return <dialog className="recipe-dialog" aria-labelledby="recipe-form-title" ref={dialog} onCancel={(event) => { if (busy) event.preventDefault(); }} onClose={() => onSave(null)}>
    <div className="dialog-heading"><div><p className="eyebrow">OUR RECIPE BOOK</p><h2 id="recipe-form-title">เก็บสูตรอร่อยไว้ด้วยกัน</h2></div><button className="icon-button" type="button" aria-label="ปิดแบบฟอร์ม" title="ปิด" disabled={busy} onClick={() => dialog.current.close()}><X size={20} /></button></div>
    <form onSubmit={submit} className="recipe-form">
      <label>ชื่อเมนู<input ref={nameInput} required maxLength={100} value={form.name} onChange={(event) => field("name", event.target.value)} placeholder="เช่น ข้าวไก่อบของเรา" /></label>
      <label>ลิงก์ TikTok <span className="muted font-normal">(ไม่บังคับ)</span><input type="url" maxLength={2000} value={form.video} onChange={(event) => field("video", event.target.value)} placeholder="https://www.tiktok.com/@.../video/..." /></label>
      <label>วัตถุดิบสำหรับ 2 คน<textarea required maxLength={10000} rows={4} value={form.ingredients} onChange={(event) => field("ingredients", event.target.value)} placeholder={"ไก่ 300 กรัม\nข้าวสาร 150 กรัม"} /><span className="field-note">หนึ่งวัตถุดิบพร้อมปริมาณ ต่อหนึ่งบรรทัด</span></label>
      <label>วิธีทำ<textarea required maxLength={20000} rows={4} value={form.steps} onChange={(event) => field("steps", event.target.value)} placeholder={"หั่นไก่และเตรียมเครื่องปรุง\nผัดไก่จนสุกทั่ว"} /><span className="field-note">หนึ่งขั้นตอน ต่อหนึ่งบรรทัด</span></label>
      <label><span className="flex items-center gap-2"><LockKeyhole size={15} /> รหัสผ่านเจ้าของสูตร</span><input type="password" required autoComplete="current-password" value={form.password} onChange={(event) => field("password", event.target.value)} /></label>
      {error && <p className="error-message" role="alert">{error}</p>}
      <button className="button-primary" type="submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={18} /> : <Plus size={18} />} {busy ? "กำลังบันทึก…" : "บันทึกสูตร"}</button>
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
  const [formOpen, setFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copyState, setCopyState] = useState("");
  const [notice, setNotice] = useState("");
  const [legacyRecipes, setLegacyRecipes] = useState([]);
  const generation = useRef(0);
  const loadGeneration = useRef(0);
  const active = modes.find((item) => item.id === mode);
  const home = mode === "home";
  const menus = mode === "food" ? foodMenus : mode === "snacks" ? snackMenus : loadState === "error" ? homeMenus : recipes;
  const filtered = menus.filter((menu) => `${menu.name} ${menu.category}`.toLocaleLowerCase().includes(query.toLocaleLowerCase().trim()));

  async function loadRecipes() {
    const request = ++loadGeneration.current;
    setLoadState("loading");
    try {
      const result = await api("/api/recipes");
      if (!Array.isArray(result) || result.some((recipe) => validateRecipe(recipe))) throw new Error("Invalid response");
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
    setMode(value); setSelected(null); setCopyState(""); setMessage(""); setQuery(""); setNotice("");
  }
  function choose(menu) {
    generation.current += 1;
    setSelected(menu); setMessage(pick(messages)); setRevision((value) => value + 1); setCopyState("");
  }
  function randomize() {
    const choices = menus.filter((menu) => menu !== selected);
    if (choices.length) choose(pick(choices));
  }
  async function copy() {
    const current = generation.current;
    try {
      await navigator.clipboard.writeText(home ? recipeText(selected) : selected.name);
      if (current === generation.current) setCopyState("คัดลอกแล้ว");
    } catch { if (current === generation.current) setCopyState("คัดลอกไม่ได้ ลองอีกครั้ง"); }
  }
  async function saveRecipe(recipe, password) {
    if (!recipe) { setFormOpen(false); return; }
    setBusy(true);
    try {
      const saved = await api("/api/recipes", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${password}` }, body: JSON.stringify(recipe) });
      // Refresh the shared list to include recipes added from other devices.
      await loadRecipes();
      setFormOpen(false); choose(saved); setNotice("บันทึกสูตรแล้ว เปิดดูได้จากทุกอุปกรณ์");
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
      <div className="intro"><p className="eyebrow">A LITTLE LESS THINKING, A LITTLE MORE US</p><h1>วันนี้กินอะไรดี?</h1><p className="muted">มาสุ่มกันนนน</p></div>
      <div className="mode-tabs" role="group" aria-label="เลือกหมวดเมนู">{modes.map(({ id, label, icon: Icon }) => <button type="button" key={id} aria-pressed={mode === id} onClick={() => changeMode(id)}><Icon size={18} /><span>{label}</span></button>)}</div>
      <div className="mode-meta"><span>{active.note}</span><span>{menus.length} เมนู{home && " · 2 คน"}</span></div>
      <section className={`picker-result ${home ? "home-result" : ""}`} aria-live="polite">
        <div key={revision} className="result-content">
          <div className="result-symbol" aria-hidden="true">{home ? <CookingPot size={35} /> : mode === "snacks" ? <CakeSlice size={35} /> : <Utensils size={35} />}</div>
          <span className="tag">{selected?.category || (home ? "สำหรับเราสองคน" : "เลือกหมวดที่ชอบ แล้วสุ่มเลย")}</span>
          <h2>{selected?.name || active.empty}</h2>
          <p className="result-message">{message || "วันนี้ไม่ต้องคิดเยอะ เดี๋ยวเลือกให้เอง"}</p>
        </div>
      </section>
      <div className="result-actions"><button className="button-primary" type="button" disabled={!menus.length || (home && loadState === "loading")} onClick={randomize}><Shuffle size={20} /> สุ่มเมนูให้เธอ</button><button className="icon-button copy-button" type="button" title={home ? "คัดลอกสูตรและวัตถุดิบ" : "คัดลอกเมนู"} aria-label={home ? "คัดลอกสูตรและวัตถุดิบ" : "คัดลอกเมนู"} disabled={!selected} onClick={copy}>{copyState === "คัดลอกแล้ว" ? <Check size={20} /> : <Copy size={20} />}</button></div>
      <p className="feedback" role="status">{copyState || notice}</p>
      {home && loadState === "error" && <div className="error-message" role="alert">เชื่อมต่อสูตรที่บันทึกไว้ไม่ได้ กำลังแสดงสูตรเริ่มต้น <button type="button" onClick={loadRecipes}>ลองอีกครั้ง</button></div>}
      {home && selected && <RecipeDetails key={`${selected.name}-${revision}`} recipe={selected} />}
      <div className="library-bar"><button className="library-toggle" type="button" aria-expanded={listOpen} aria-controls="menu-library" onClick={() => setListOpen((value) => !value)}><List size={18} /> {listOpen ? "ซ่อนลิสต์เมนู" : "ดูลิสต์เมนู"} {listOpen ? <ChevronUp size={17} /> : <ChevronDown size={17} />}</button>{home && <button className="add-recipe" type="button" onClick={() => setFormOpen(true)}><Plus size={17} /> เพิ่มสูตร</button>}</div>
      {listOpen && <section id="menu-library" className="menu-library" aria-label="รายการเมนู"><label className="search-field"><Search size={18} /><input type="search" aria-label="ค้นหาเมนู" placeholder="ค้นหาเมนูที่ชอบ…" value={query} onChange={(event) => setQuery(event.target.value)} /></label><ul>{filtered.map((menu) => <li key={menu.id || menu.name}><div><strong>{menu.name}</strong><span>{menu.category}{home ? " · 2 คน" : ""}</span></div>{home && <button className="recipe-open" type="button" aria-label={`ดูสูตร ${menu.name}`} onClick={() => choose(menu)}>ดูสูตร <ArrowUpRight size={16} /></button>}</li>)}</ul>{!filtered.length && <p className="muted text-center py-6">{home && loadState === "loading" ? "กำลังโหลดสูตร…" : "ไม่พบเมนูที่ค้นหา"}</p>}</section>}
      {home && legacyRecipes.length > 0 && <div className="legacy-notice"><p>พบ {legacyRecipes.length} สูตรที่เคยเก็บในเบราว์เซอร์นี้</p><button type="button" onClick={exportLegacy}><Download size={16} /> ดาวน์โหลดสูตรเดิม</button></div>}
      <footer className="app-footer"><Heart size={14} /> {home ? "มื้อธรรมดา ที่พิเศษเพราะกินด้วยกัน" : "กินให้อร่อยนะคนเก่ง"}</footer>
    </main>
    {formOpen && <RecipeForm onSave={saveRecipe} busy={busy} />}
  </div>;
}
