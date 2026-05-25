const foodMenus = [
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

const snackMenus = [
  { name: "เค้กสตรอว์เบอร์รี", category: "เค้ก" },
  { name: "เค้กช็อกโกแลตหน้านิ่ม", category: "เค้ก" },
  { name: "ชีสเค้กหน้าไหม้", category: "เค้ก" },
  { name: "เครปเค้กวนิลา", category: "เค้ก" },
  { name: "บราวนี่ช็อกโกแลต", category: "เบเกอรี" },
  { name: "ครอฟเฟิลน้ำผึ้ง", category: "เบเกอรี" },
  { name: "ครัวซองต์เนยสด", category: "เบเกอรี" },
  { name: "โดนัทน้ำตาล", category: "เบเกอรี" },
  { name: "ขนมปังปิ้งเนยนม", category: "ปิ้งปัง" },
  { name: "ขนมปังปิ้งช็อกโกแลต", category: "ปิ้งปัง" },
  { name: "ขนมปังปิ้งสังขยาใบเตย", category: "ปิ้งปัง" },
  { name: "ขนมปังปิ้งกล้วยนูเทลล่า", category: "ปิ้งปัง" },
  { name: "วาฟเฟิลไอศกรีม", category: "หวานเย็น" },
  { name: "บิงซูนมสด", category: "หวานเย็น" },
  { name: "ไอศกรีมคุกกี้แอนด์ครีม", category: "หวานเย็น" },
  { name: "พุดดิ้งคาราเมล", category: "หวานนุ่ม" },
  { name: "บัวลอยไข่หวาน", category: "ไทยหวาน" },
  { name: "กล้วยบวชชี", category: "ไทยหวาน" },
  { name: "ข้าวเหนียวมะม่วง", category: "ไทยหวาน" },
  { name: "โรตีใส่นม", category: "หวานกรอบ" },
  { name: "แพนเค้กเมเปิล", category: "หวานนุ่ม" },
  { name: "คุกกี้ช็อกโกแลตชิป", category: "เบเกอรี" },
  { name: "มาการอง", category: "หวานน่ารัก" },
  { name: "ชูครีมวนิลา", category: "หวานนุ่ม" },
  { name: "ชามะนาวหวาน 30", category: "เครื่องดื่ม" },
  { name: "ชาไทยเย็น", category: "เครื่องดื่ม" },
  { name: "โกโก้เย็น", category: "เครื่องดื่ม" },
  { name: "นมชมพูเย็น", category: "เครื่องดื่ม" },
  { name: "มัทฉะลาเต้เย็น", category: "เครื่องดื่ม" },
  { name: "สตรอว์เบอร์รีโซดา", category: "เครื่องดื่ม" },
];

const pickerTypes = {
  food: {
    label: "หมวด: อาหาร",
    nextButton: "เปลี่ยนเป็นของกินเล่น",
    emptyTag: "อาหาร",
    emptyName: "พร้อมสุ่มอาหารแล้ว",
    menus: foodMenus,
  },
  snacks: {
    label: "หมวด: ของกินเล่น",
    nextButton: "เปลี่ยนเป็นอาหาร",
    emptyTag: "ของกินเล่น",
    emptyName: "พร้อมสุ่มของกินเล่นแล้ว",
    menus: snackMenus,
  },
};

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
const pickerTypeLabel = document.querySelector("#pickerTypeLabel");
const categorySwitchButton = document.querySelector("#categorySwitchButton");
const toggleListButton = document.querySelector("#toggleListButton");
const menuPanel = document.querySelector("#menuPanel");
const menuList = document.querySelector("#menuList");

let selectedMenu = "";
let activePickerType = "food";

function getActiveMenus() {
  return pickerTypes[activePickerType].menus;
}

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

  getActiveMenus().forEach((menu) => {
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

function updatePickerType() {
  const pickerType = pickerTypes[activePickerType];

  pickerTypeLabel.textContent = pickerType.label;
  categorySwitchButton.textContent = pickerType.nextButton;
  categoryTag.textContent = pickerType.emptyTag;
  menuName.textContent = pickerType.emptyName;
  cuteMessage.textContent = "เลือกหมวดให้แล้วนะ 💖";
  selectedMenu = "";
  copyButton.disabled = true;
  copyButton.textContent = "คัดลอกเมนู";

  if (!menuPanel.hidden) {
    renderMenuList();
  }

  replayAnimation();
}

randomButton.addEventListener("click", () => {
  const menus = getActiveMenus();

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

categorySwitchButton.addEventListener("click", () => {
  activePickerType = activePickerType === "food" ? "snacks" : "food";
  updatePickerType();
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
