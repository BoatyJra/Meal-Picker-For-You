let menus = [
  { name: "ข้าวกะเพราไก่ไข่ดาว", category: "ตามสั่ง" },
  { name: "ข้าวหมูทอดกระเทียม", category: "ตามสั่ง" },
  { name: "ข้าวไก่ทอดซอสเกาหลี", category: "เกาหลี" },
  { name: "ข้าวหมูทอดไข่ดาว", category: "ไทย" },
  { name: "โจ๊กกับปาท่องโก๋", category: "รองท้อง" },
  { name: "ข้าวหน้าหมูญี่ปุ่น", category: "ญี่ปุ่น" },
  { name: "ข้าวหน้าไก่เทอริยากิ", category: "ญี่ปุ่น" },
  { name: "ทงคัตสึหมูราดแกงกะหรี่", category: "ญี่ปุ่น" },
  { name: "ราเมนหมูชาชู", category: "ญี่ปุ่น" },
  { name: "อุด้งหมูสไลซ์", category: "เส้น" },
  { name: "สปาเกตตีคาโบนาร่าเบคอน", category: "เส้น" },
  { name: "สปาเกตตีซอสมะเขือเทศหมูสับ", category: "เส้น" },
  { name: "ผัดไทยไก่", category: "เส้น" },
  { name: "สุกี้แห้งไก่", category: "healthy-ish" },
  { name: "สุกี้น้ำหมู", category: "healthy-ish" },
  { name: "ข้าวไก่ย่างน้ำจิ้มแจ่ว", category: "healthy-ish" },
  { name: "สลัดไก่ย่าง", category: "healthy-ish" },
  { name: "ข้าวยำไก่แซ่บ", category: "comfort" },
  { name: "ข้าวหมูย่างจิ้มแจ่ว", category: "อิ่มหนัก" },
  { name: "ข้าวคอหมูย่าง", category: "อิ่มหนัก" },
  { name: "ข้าวหมูผัดกิมจิ", category: "เกาหลี" },
  { name: "ข้าวไก่กรอบซอสหวาน", category: "comfort" },
  { name: "ข้าวไข่ข้นแฮม", category: "comfort" },
  { name: "ข้าวไข่เจียวหมูสับ", category: "comfort" },
  { name: "ข้าวลาบหมู", category: "healthy-ish" },
  { name: "ข้าวน้ำตกหมู", category: "อิ่มหนัก" },
  { name: "มาม่าผัดขี้เมาไก่", category: "เส้น" },
  { name: "ข้าวซอยไก่", category: "เส้น" },
  { name: "พิซซ่าหน้าแฮมชีส", category: "comfort" },
  { name: "เบอร์เกอร์ไก่กรอบ", category: "อิ่มหนัก" },
];

const cuteMessages = [
  "มื้อนี้เลือกให้แล้วนะ 💖",
  "อันนี้น่ากินมาก เธอลองมั้ย 💕",
  "พี่ว่าเมนูนี้เข้ากับวันนี้สุดๆ",
  "กินให้อร่อยนะคนเก่ง ✨",
  "มื้อนี้มีพี่คิดให้",
];

const randomButton = document.querySelector("#randomButton");
const copyButton = document.querySelector("#copyButton");
const categoryTag = document.querySelector("#categoryTag");
const menuName = document.querySelector("#menuName");
const cuteMessage = document.querySelector("#cuteMessage");
const result = document.querySelector(".result");
const toggleListButton = document.querySelector("#toggleListButton");
const menuPanel = document.querySelector("#menuPanel");
const menuList = document.querySelector("#menuList");

let selectedMenu = "";

function pickRandomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function replayAnimation() {
  result.classList.remove("pop");
  void result.offsetWidth;
  result.classList.add("pop");
}

function renderMenuList() {
  menuList.innerHTML = "";

  menus.forEach((menu) => {
    const item = document.createElement("li");
    item.className = "menu-item";

    const name = document.createElement("strong");
    const tag = document.createElement("span");

    name.textContent = menu.name;
    tag.className = "tag";
    tag.textContent = menu.category;

    item.append(name, tag);
    menuList.append(item);
  });
}

randomButton.addEventListener("click", () => {
  if (menus.length === 0) {
    categoryTag.textContent = "ไม่มีเมนู";
    menuName.textContent = "เพิ่มเมนูก่อนนะ";
    cuteMessage.textContent = "ลิสต์ว่างอยู่เลย";
    copyButton.disabled = true;
    replayAnimation();
    return;
  }

  const menu = pickRandomItem(menus);

  selectedMenu = menu.name;
  categoryTag.textContent = menu.category;
  menuName.textContent = menu.name;
  cuteMessage.textContent = pickRandomItem(cuteMessages);
  copyButton.disabled = false;
  copyButton.textContent = "คัดลอกเมนู";

  replayAnimation();
});

toggleListButton.addEventListener("click", () => {
  const isHidden = menuPanel.hidden;

  menuPanel.hidden = !isHidden;
  toggleListButton.setAttribute("aria-expanded", String(isHidden));
  toggleListButton.textContent = isHidden ? "ซ่อนลิสต์เมนู" : "ดูลิสต์เมนู";

  if (isHidden) {
    renderMenuList();
  }
});

copyButton.addEventListener("click", async () => {
  if (!selectedMenu) return;

  try {
    await navigator.clipboard.writeText(selectedMenu);
    copyButton.textContent = "คัดลอกแล้ว";
  } catch {
    copyButton.textContent = "คัดลอกไม่ได้";
  }
});
