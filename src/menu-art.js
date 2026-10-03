export function menuArt(menu, mode) {
  const text = `${menu?.name || ""} ${menu?.category || ""}`;
  if (mode === "snacks") {
    return /เครื่องดื่ม|ชา|โกโก้|นมชมพู|ลาเต้|โซดา|กาแฟ|น้ำผลไม้/.test(text) ? "drink" : "sweet";
  }
  return /เส้น|สปาเกต|พาสต|ราเมน|อุด้ง|มาม่า|ผัดไทย|ข้าวซอย/.test(text) ? "noodles" : "rice";
}
