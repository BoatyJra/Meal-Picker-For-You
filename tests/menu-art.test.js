import { test } from "node:test";
import assert from "node:assert/strict";
import { menuArt, categoryArt, randomCategoryArt } from "../src/menu-art.js";

test("Artwork follows the menu type in each mode", () => {
  assert.equal(menuArt({ name: "สปาเกตตีคาโบนาร่าเบคอน", category: "เส้น" }, "food"), "noodles");
  assert.equal(menuArt({ name: "ข้าวกะเพราไก่ไข่ดาว", category: "ตามสั่ง" }, "food"), "rice");
  assert.equal(menuArt({ name: "ชามะนาวหวาน 30", category: "เครื่องดื่ม" }, "snacks"), "drink");
  assert.equal(menuArt({ name: "เค้กช็อกโกแลต", category: "เค้ก" }, "snacks"), "sweet");
  assert.equal(menuArt(null, "home"), "rice");
});

test("Each category has five artwork choices and avoids immediate repeats", () => {
  for (const mode of ["food", "snacks", "home"]) {
    assert.equal(new Set(categoryArt[mode]).size, 5);
    const all = new Set(Array.from({ length: 5 }, (_, index) => randomCategoryArt(mode, null, () => (index + .5) / 5)));
    assert.deepEqual(all, new Set(categoryArt[mode]));
    for (const previous of categoryArt[mode]) {
      for (const value of [0, .25, .5, .75, .999]) {
        const next = randomCategoryArt(mode, previous, () => value);
        assert.notEqual(next, previous);
        assert.ok(categoryArt[mode].includes(next));
      }
    }
  }
});
