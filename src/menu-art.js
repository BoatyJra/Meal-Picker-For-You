export const categoryArt = {
  food: ["rice", "noodles", "salad", "fried", "curry"],
  snacks: ["sweet", "drink", "pastry", "icecream", "pancakes"],
  dinein: ["cooking", "fried", "noodles", "curry", "rice"],
  home: ["rice", "noodles", "salad", "curry", "cooking"],
};

export function randomCategoryArt(mode, previous, random = Math.random) {
  const choices = (categoryArt[mode] || categoryArt.food).filter((art) => art !== previous);
  return choices[Math.min(choices.length - 1, Math.max(0, Math.floor(random() * choices.length)))];
}

export function menuArt(menu, mode) {
  const text = `${menu?.name || ""} ${menu?.category || ""}`;
  if (mode === "dinein") {
    if (/สุกี้|ชาบู|MK|Mo-Mo|You & I/i.test(text)) return "cooking";
    if (/ปิ้งย่าง|BBQ|Bar B Q|Yakiniku|Sukishi|สเต๊ก|เบอร์เกอร์|พิซซ่า/i.test(text)) return "fried";
    if (/ราเมน|ญี่ปุ่น|Katsuya|Sukiya|Fuji|Yayoi|Kouen|Oishi|Hachiban/i.test(text)) return "noodles";
    if (/สลัด|สุขภาพ/i.test(text)) return "salad";
    return /ไทย|ซีฟู้ด/.test(text) ? "curry" : "rice";
  }
  if (mode === "snacks") {
    if (/ไอศกรีม|บิงซู|หวานเย็น/.test(text)) return "icecream";
    if (/แพนเค้ก|วาฟเฟิล|ครอฟเฟิล/.test(text)) return "pancakes";
    if (/ครัวซองต์|โดนัท|เบเกอรี/.test(text)) return "pastry";
    return /เครื่องดื่ม|ชา|โกโก้|นมชมพู|ลาเต้|โซดา|กาแฟ|น้ำผลไม้/.test(text) ? "drink" : "sweet";
  }
  if (/สลัด|healthy-ish/.test(text)) return "salad";
  if (/แกงกะหรี่|แกง/.test(text)) return "curry";
  if (mode === "food" && /ทอด|กรอบ/.test(text)) return "fried";
  return /เส้น|สปาเกต|พาสต|ราเมน|อุด้ง|มาม่า|ผัดไทย|ข้าวซอย/.test(text) ? "noodles" : "rice";
}
