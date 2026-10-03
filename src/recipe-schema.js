export function validTikTokUrl(value) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password &&
      (url.hostname === "tiktok.com" || url.hostname.endsWith(".tiktok.com"));
  } catch { return false; }
}

export function validateRecipe(recipe) {
  if (!recipe || typeof recipe.name !== "string" || !recipe.name.trim() || recipe.name.length > 100) return "กรอกชื่อเมนู ไม่เกิน 100 ตัวอักษร";
  if (typeof recipe.video !== "string" || recipe.video.length > 2000 || !validTikTokUrl(recipe.video)) return "ใช้ลิงก์ https:// ของ TikTok เท่านั้น";
  for (const key of ["ingredients", "steps"]) {
    if (!Array.isArray(recipe[key]) || !recipe[key].length || recipe[key].length > 100 || recipe[key].some((line) => typeof line !== "string" || !line.trim() || line.length > 1000)) {
      return "กรอกวัตถุดิบและวิธีทำให้ครบ แต่ละบรรทัดไม่เกิน 1,000 ตัวอักษร";
    }
  }
  return null;
}

export function recipeText(recipe) {
  return [recipe.name, "สำหรับ 2 คน", "วัตถุดิบ", ...recipe.ingredients,
    "วิธีทำ", ...recipe.steps.map((step, index) => `${index + 1}. ${step}`), recipe.video || ""].join("\n");
}
