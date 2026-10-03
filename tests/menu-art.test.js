import { test } from "node:test";
import assert from "node:assert/strict";
import { menuArt } from "../src/menu-art.js";

test("Artwork follows the menu type in each mode", () => {
  assert.equal(menuArt({ name: "สปาเกตตีคาโบนาร่าเบคอน", category: "เส้น" }, "food"), "noodles");
  assert.equal(menuArt({ name: "ข้าวกะเพราไก่ไข่ดาว", category: "ตามสั่ง" }, "food"), "rice");
  assert.equal(menuArt({ name: "ชามะนาวหวาน 30", category: "เครื่องดื่ม" }, "snacks"), "drink");
  assert.equal(menuArt({ name: "เค้กช็อกโกแลต", category: "เค้ก" }, "snacks"), "sweet");
  assert.equal(menuArt(null, "home"), "rice");
});
